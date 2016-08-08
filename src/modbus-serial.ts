var SerialPort = require("serialport");
var now = require("performance-now")
var async = require('async');
var Promise = require("bluebird");


if (process.env.NODE_ENV == 'test') {
  SerialPort = require('./virtual-serialport');
}

import {State, Task} from "./modbus";
import {crc16_modbus} from "./modbus";

//FIXME: disconnect and error state
//FIXME: handle usb pulled out, serial port is not available after opening
//FIXME: Auto-reconnect options
//FIXME: timer is poor handled, Adjust timer based on baud rate, timer interval and max time out can be configured by client side as well



export class ModbusSerialPort {
    port: string;
    serialPort : any;

    incomingBuffer : Buffer; 
    incomingLength : number;

    requestQueue : any; //async/queue

    currentTask : Task;

    state : State;

    MAX_TIME_OUT : number;
    MAX_RETRY : number;

    timer: any;
    writeTime : any; //when the data is written to slave

    seqId : number;

    constructor(port: string) {
        this.port = port;
        this.incomingBuffer = Buffer.alloc(512, 0);

        this.MAX_TIME_OUT = 2000; //in milli seconds
        this.MAX_RETRY = 3;

        this.seqId = 0;
 
        this.state = State.NotOpened;

        this.incomingLength = 0;
    }

    connect():Promise<string> {
      
        console.log("opening port ", this.port);

        var options = {
            "baudRate" : 9600,
            "stopBits" : 1,
            "parity" : "none",
            "autoOpen" : false
        }

        /*
        rtscts 	boolean 	false 	flow control setting
        xon 	boolean 	false 	flow control setting
        xoff 	boolean 	false 	flow control setting
        xany 	boolean 	false 	flow control setting
        */

        this.serialPort = new SerialPort(this.port, options);
        
        this.serialPort.on("open", (err: any) => (this.onOpen()));
        this.serialPort.on("data", (data : Buffer) => (this.onReceive(data)));
        this.serialPort.on("error", (error:any) => (this.onError(error)));
        this.serialPort.on("disconnect", (error:any) => (this.onDisconnect(error)));
        this.serialPort.on("close", (error: any) => (this.onClose()));
        

        this.timer = setInterval(() => this.timerPoll(), 200);

        var __this = this;
 
        this.requestQueue = async.queue(function(task : Task, callback : Function) {
             task.callback = callback;
 
             console.log("Executing task ==> ", task.id);
            __this.execute(task);
        }, 1);


        //PATCH: async/queue
        //mercyKill takes callback for each task cleanup 
        this.requestQueue.mercyKill = function(callback : Function) {
            if (!callback) 
                return this.kill();

            while ( this._tasks.length > 0){
                var node  = this._tasks.shift();
                callback(node.data);
            }
        }

        //FIXME: this is not working against new promise closure
        //var _this = this;

        return new Promise(function(resolve : Function, reject : Function){
            
            __this.serialPort.on("open", function() {
                console.log("on promise ");
                resolve();
            });

            __this.serialPort.on("error", function(err :any) {
                reject(err);
            });

             __this.serialPort.open();
        });
    }

    onOpen() {
        console.log("Port Opened");
        this.state = State.Opened;
    }

    onError(msg : any) {
        console.log("***ERROR***", msg);
    }

    onDisconnect(msg : any) {
        console.log("***onDisconnect***", msg);
        this.state = State.Closed;
    }

    onClose(){
         console.log("***Closed***");
         this.state = State.Closed;
    }
 
    

    retryCurrentTask() {
        if (this.currentTask == null)
        return;

        console.log("Task Time out ", this.currentTask.id);

        console.log("Queue Length ", this.requestQueue.length());

        console.log("Queue workersList Length ", this.requestQueue.workersList().length);

        console.log("Queue running Length ", this.requestQueue.running().length);
        
        var callback = this.currentTask.callback;

        this.currentTask.retry += 1;
        this.currentTask.callback = null;

        console.log("retry for ", this.currentTask.retry);

        if (this.currentTask.retry >= this.MAX_RETRY) {
            console.log("max retry reached, failing promises");

            if (this.currentTask.reject) {
                this.currentTask.reject("MAX_RETR");
                this.currentTask.reject = null;
                this.currentTask.resolve = null;
            }

            this.currentTask = null;

            callback();
            return;
        }

        var task = this.currentTask;
        this.currentTask = null;

        this.addToQueue(task, true);

        console.log("Added to front of the queue");

        callback();
    }

    timerPoll() {
        if (this.currentTask) {
            if ((now() - this.writeTime) > this.MAX_TIME_OUT)
            {
                console.log("elasped time ", now() - this.writeTime);
                console.log("TIME OUT");
                this.retryCurrentTask();
            }
        }
    }

    cleanup() {
        if (this.state == State.NotOpened)
            return;

        this.requestQueue.pause();
        
        clearInterval(this.timer);
        this.serialPort.close();

        if (this.currentTask != null        && 
            this.currentTask.reject != null && 
            this.currentTask.resolve != null) {
            
            this.currentTask.reject("Closing port");
            this.currentTask.reject = null;
            this.currentTask.resolve = null;
        }

        this.requestQueue.mercyKill(function(task : Task){
            console.log("Cleaning task ", task.id);

            if (task && task.reject) {
                task.reject("serial port closed");
                task.reject = null;
                task.resolve = null;
            }
        });

        this.requestQueue.kill();
    }

    close() {
        this.cleanup();
    }

    onReceive(data: Buffer) {
        console.log("data received ", data, "Length ", data.length);
        
        console.log("this port ", this.port);

        if (this.currentTask == null) {
            console.log("current task is null, nothing to do");
            return;
        }
        

        if (data.length > 0) {
            data.copy(this.incomingBuffer, this.incomingLength, 0, data.length);
        }
        

        this.incomingLength += data.length;


        if (this.currentTask.expected == this.incomingLength) {
            console.log("RECEIVED FULL", this.currentTask.expected);
        } else {
            console.log("RECEIVED PARTIAL", this.currentTask.expected, this.incomingLength);
        }

        if (this.currentTask != null && (this.currentTask.expected == this.incomingLength)) {
            
            let crc = this.incomingBuffer[this.incomingLength - 1];
            crc = crc << 8;
            crc |= (0xff && this.incomingBuffer[this.incomingLength - 2]);

            let calculatedCRC = crc16_modbus(this.incomingBuffer, this.incomingLength - 2);

            if (crc !== calculatedCRC) {
                console.log("INCORRECT CRC*", crc.toString(16), calculatedCRC.toString(16));
                 this.retryCurrentTask();
                 return;
            }

            if (this.currentTask.resolve) {
                console.log("processing resolve");

                let buffer = Buffer.alloc(this.incomingLength, 0);
                this.incomingBuffer.copy(buffer, 0, 0, this.incomingLength);

                this.currentTask.resolve(buffer);

                this.currentTask.resolve = null;
                this.currentTask.reject = null;
            }

            if (this.currentTask.callback != null) {
                console.log("processing callback");
                var task = this.currentTask;
                this.currentTask = null;
                task.callback();
                task = null;
            }
        } else {
            console.log("current task is null");
        }
    }

    execute(task: any) {
        this.currentTask = task;
        this.write(task.buffer);
    }

    write(buffer: any) {
        console.log("Writing to port");

        this.incomingLength = 0;
        this.writeTime = now();
        this.serialPort.write(buffer);
    }

    addToQueue(task: Task, front: boolean) { 
         
         if (front) {
             this.requestQueue.unshift(task);
         } else {
             console.log("Adding task ", task.id);
              this.requestQueue.push(task);
         }
        
         console.log("pending requests ", this.requestQueue.length());
    }


    addToTaskQueue(buffer:Buffer, expected: number) {
        let __this = this;

        return new Promise(function(resolve : Function, reject : Function){

            let task: Task;
            task = {
                'buffer': buffer,
                'resolve': resolve,
                'reject': reject,
                'expected' : expected,
                'callback' : null, //initialized by task queue,
                retry: 0,
                id: __this.seqId
            }

            __this.seqId += 1;

            if (__this.seqId >= Number.MAX_SAFE_INTEGER) {
                __this.seqId = 0;
            }

            __this.addToQueue(task, false);
            
             console.log("Added to queue");
        });

    }

    readRegistersInternal(slave: number, functionCode :number, address: number, count: number):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        
        console.log("Reading ", slave, address, count);

        var buffer = Buffer.alloc(8, 0);
        buffer[0] = slave;
        buffer[1] = functionCode; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        buffer[4] = (count & 0xff00) >> 8;
        buffer[5] = count & 0x00ff;
          
        var crc = crc16_modbus(buffer, 6);

        buffer[6] = crc & 0x00ff;
        buffer[7] = (crc & 0xff00) >> 8;


         //slave (1), function code (1), data bytes count (1), crc (2) + count * 2
        var expectedDataCount = 5 + count  * 2;
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 

        return this.addToTaskQueue(buffer, expectedDataCount);
    }


    readCoilsInternal(slave: number, functionCode :number, address: number, count: number):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        
        console.log("Reading ", slave, address, count);

        var buffer = Buffer.alloc(8, 0);
        buffer[0] = slave;
        buffer[1] = functionCode; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        buffer[4] = (count & 0xff00) >> 8;
        buffer[5] = count & 0x00ff;
          
        var crc = crc16_modbus(buffer, 6);

        buffer[6] = crc & 0x00ff;
        buffer[7] = (crc & 0xff00) >> 8;


         //slave (1), function code (1), data bytes count (1), crc (2) + Math.ceil(count  / 8)
        var expectedDataCount = 5 + Math.ceil(count  / 8);
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 


        return this.addToTaskQueue(buffer, expectedDataCount);
    }


    readHoldingRegisters(slave: number, address: number, count: number):Promise<Buffer>  {
        console.log("Reading ", slave, address, count);

         return this.readRegistersInternal(slave, 3, address, count);
    }

    readInputRegisters(slave: number, address: number, count: number):Promise<Buffer>  {
            console.log("Reading ", slave, address, count);

            return this.readRegistersInternal(slave, 4, address, count);
    }


    readCoils(slave: number, address: number, count: number):Promise<Buffer>  {
            console.log("Reading ", slave, address, count);

            return this.readCoilsInternal(slave, 1, address, count);
    }

    readDiscreteInputs(slave: number, address: number, count: number):Promise<Buffer>  {
            console.log("Reading ", slave, address, count);

            return this.readCoilsInternal(slave, 2, address, count);
    }
 
    writeMultipleRegisters(slave: number, address: number, dataBuffer: Buffer):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        
        var buffer = Buffer.alloc(9 + dataBuffer.length, 0);
        buffer[0] = slave;
        buffer[1] = 16; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        //registers to write
        buffer[4] = ((dataBuffer.length / 2) & 0xff00) >> 8;
        buffer[5] = (dataBuffer.length / 2) & 0x00ff;

        //number of data bytes to follow
        buffer[6] = dataBuffer.length & 0x00ff;


        console.log("buffer => ", buffer.toString("hex"));

        console.log("dataBuffer => ", dataBuffer.toString("hex"));

        dataBuffer.copy(buffer, 7, 0);

        console.log("{}buffer => ", buffer.toString("hex"));
          
        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 


         //slave (1), FC (1), Address (2), Registers Count (2) crc (2)
        var expectedDataCount = 8;
        

        return this.addToTaskQueue(buffer, expectedDataCount);
    }

    writeMultipleCoils(slave: number, address: number, bitsBuffer: Buffer):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        
        
        const dataLength = Math.ceil(bitsBuffer.length / 8.0);
        
        var dataBuffer = Buffer.alloc(dataLength, 0);

        var byte = 0;
        var index = 0;
        for (var i = 0; i < bitsBuffer.length; i++) {
            if (i != 0 && i % 8 == 0) {
                dataBuffer[index] = byte;
                byte = 0;
                index++;
            }

            byte = byte | (bitsBuffer[i] << (i % 8));
        }

        if (byte != 0) {
            dataBuffer[dataBuffer.length - 1] = byte;
        }

        var buffer = Buffer.alloc(9 + dataLength, 0);
        buffer[0] = slave;
        buffer[1] = 15; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        //coils to write
        buffer[4] = ((bitsBuffer.length) & 0xff00) >> 8;
        buffer[5] = (bitsBuffer.length) & 0x00ff;

        //number of data bytes to follow
        buffer[6] = dataBuffer.length & 0x00ff;


        console.log("buffer => ", buffer.toString("hex"));

        console.log("dataBuffer => ", dataBuffer.toString("hex"));

        dataBuffer.copy(buffer, 7, 0);

        console.log("{}buffer => ", buffer.toString("hex"));
          
        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 


         //slave (1), FC (1), Address (2), Registers Count (2) crc (2)
        var expectedDataCount = 8;
        

        return this.addToTaskQueue(buffer, expectedDataCount);
    }


    writeSingleRegister(slave: number, address: number, value: number):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        
        var buffer = Buffer.alloc(8, 0);
        buffer[0] = slave;
        buffer[1] = 0x06; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        //value to write
        buffer[4] = (value & 0xff00) >> 8;
        buffer[5] = value & 0x00ff;
  
        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 


         //slave (1), FC (1), Address (2), value writen (2) crc (2)
        var expectedDataCount = 8;
        
        return this.addToTaskQueue(buffer, expectedDataCount);

    }

    writeSingleCoil(slave: number, address: number, value: boolean):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
        

        var buffer = Buffer.alloc(8, 0);
        buffer[0] = slave;
        buffer[1] = 0x05; //function code
         
        buffer[2] = (address & 0xff00) >> 8;
        buffer[3] = address & 0x00ff;

        //Write 0xFF00 to enable, 0x0000 to disable
        //value to write
        if (value) {
            buffer[4] = 0xff;
        }

        //FIXME: Not needed, as we already set o by default
        //buffer[5] = 0x00;

        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
        
        console.log("=>", buffer.toString('hex'))
        console.log(crc.toString(16)); 

        var __this = this;


         //slave (1), FC (1), Address (2), value writen (2) crc (2)
        var expectedDataCount = 8;
        
        return this.addToTaskQueue(buffer, expectedDataCount);
    }


}