var SerialPort = require("serialport");
var now = require("performance-now")
var async = require('async');
var Promise = require("bluebird");

require('buffer-v6-polyfill');

if (process.env.NODE_ENV == 'test') {
  SerialPort = require('./virtual-serialport');
}

import {State, Task} from "./modbus";
import {crc16_modbus} from "./modbus";

//FIXME: disconnect and error state
//FIXME: handle usb pulled out, serial port is not available after opening
//FIXME: Auto-reconnect options
//FIXME: timer is poor handled, Adjust timer based on baud rate, timer interval and max time out can be configured by client side as well
//FIXME: Parse the response header before responding


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

    serialPortOptions: any;
    masterOptions: any;

    constructor(port: string, portOptions:any, masterOptions: any) {
        this.port = port;
        this.incomingBuffer = Buffer.alloc(512, 0);


        this.seqId = 0;
 
        this.state = State.NotOpened;

        
        if (!portOptions) {
            portOptions = {};
        }


        /* //other default actions
        rtscts 	boolean 	false 	flow control setting
        xon 	boolean 	false 	flow control setting
        xoff 	boolean 	false 	flow control setting
        xany 	boolean 	false 	flow control setting
        */

         let options:any = {
            "autoOpen" : false,
            "baudRate" : 9600,
            "stopBits" : 1,
            "parity" : "none"
        }

        for (var key in options) {
           
            if (!(key in portOptions)){
               
                portOptions[key] = options[key];
            }
        }

        //Just to make sure that we disable autoOpen
        portOptions.autoOpen = false;

        this.serialPortOptions = portOptions;


        if (!masterOptions) {
            masterOptions = {};
        }
       
        let modbusMasterDefaultOptions:any = {
            MAX_RETRY : 3,
            MAX_TIME_OUT: 2000
        }


        for (var key in modbusMasterDefaultOptions) {
            
            if (!(key in masterOptions)){
                masterOptions[key] = modbusMasterDefaultOptions[key];
            }
        }

        this.masterOptions =  masterOptions;

        this.MAX_TIME_OUT = this.masterOptions.MAX_TIME_OUT; //in milli seconds
        this.MAX_RETRY = this.masterOptions.MAX_RETRY;

        this.masterOptions = masterOptions;

        this.incomingLength = 0;
    }

    connect():Promise<string> {
      
        
        this.serialPort = new SerialPort(this.port, this.serialPortOptions);
        
        this.serialPort.on("open", (err: any) => (this.onOpen()));
        this.serialPort.on("data", (data : Buffer) => (this.onReceive(data)));
        this.serialPort.on("error", (error:any) => (this.onError(error)));
        this.serialPort.on("disconnect", (error:any) => (this.onDisconnect(error)));
        this.serialPort.on("close", (error: any) => (this.onClose()));
        

        this.timer = setInterval(() => this.timerPoll(), 200);

        var __this = this;
 
        this.requestQueue = async.queue(function(task : Task, callback : Function) {
             task.callback = callback;
             __this.execute(task);
        }, 1);


        //PATCH: async/queue
        //mercyKill takes callback for each task cleanup
        //https://github.com/caolan/async/issues/1262
        //Need to modify internal queue/kill method, rename this function to kill
         
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
                resolve();
            });

            __this.serialPort.on("error", function(err :any) {
                reject(err);
            });

             __this.serialPort.open();
        });
    }

    onOpen() { 
        this.state = State.Opened;
    }

    //FIXME: Do promise reject for all pending request
    //FIXME: Try max connection retry feature
    onError(msg : any) {
        console.log("***ERROR***", msg);
        this.state = State.Error;
    }

    //FIXME: Do promise reject for all pending request
    onDisconnect(msg : any) {
        console.log("***onDisconnect***", msg);
        this.state = State.Closed;
    }

    //FIXME: Reject all pending request promises
    onClose(){
         console.log("***Closed***");
         this.state = State.Closed;
    }
  
    retryCurrentTask() {
        if (this.currentTask == null)
        return;
 
        var callback = this.currentTask.callback;

        this.currentTask.retry += 1;
        this.currentTask.callback = null;

       
        if (this.currentTask.retry >= this.MAX_RETRY) {
         
            if (this.currentTask.reject) {
                this.currentTask.reject("MAX_RETRY");
                this.currentTask.reject = null;
                this.currentTask.resolve = null;
            }

            this.currentTask = null;

            callback();
            return;
        }

        var task = this.currentTask;
        this.currentTask = null;

        //Adding failed task to front of the queue for re-execution
        this.addToQueue(task, true); 

        callback();
    }

    timerPoll() {
        if (this.currentTask) {
            if ((now() - this.writeTime) > this.MAX_TIME_OUT)
            { 
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
        if (this.currentTask == null) {
             return;
        }
       
        if (data.length > 0) {
            data.copy(this.incomingBuffer, this.incomingLength, 0, data.length);
        }
       
        this.incomingLength += data.length; 

        if (this.currentTask != null && (this.currentTask.expected == this.incomingLength)) {
            
            let crc = this.incomingBuffer[this.incomingLength - 1];
            crc = crc << 8;
            crc |= (0xff && this.incomingBuffer[this.incomingLength - 2]);

            let calculatedCRC = crc16_modbus(this.incomingBuffer, this.incomingLength - 2);

            //If CRC fails, request for retry. retry can be denied if max retry used
            if (crc !== calculatedCRC) {
                 this.retryCurrentTask();
                 return;
            }

            if (this.currentTask.resolve) {
                
                let buffer = Buffer.alloc(this.incomingLength, 0);
                this.incomingBuffer.copy(buffer, 0, 0, this.incomingLength);

                this.currentTask.resolve(buffer);

                this.currentTask.resolve = null;
                this.currentTask.reject = null;
            }

            if (this.currentTask.callback != null) {
                var task = this.currentTask;
                this.currentTask = null;
                task.callback();
                task = null;
            }
        }
    }

    execute(task: any) {
        this.currentTask = task;
        this.write(task.buffer);
    }

    write(buffer: any) {
        
        this.incomingLength = 0;
        this.writeTime = now();
        this.serialPort.write(buffer);
    }

    addToQueue(task: Task, front: boolean) { 
         
         if (front) {
             this.requestQueue.unshift(task);
         } else {
             
              this.requestQueue.push(task);
         }
         
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
            //add to end of the queue
            __this.addToQueue(task, false); 
        });

    }

    readRegistersInternal(slave: number, functionCode :number, address: number, count: number):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
         

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
         

        return this.addToTaskQueue(buffer, expectedDataCount);
    }


    readCoilsInternal(slave: number, functionCode :number, address: number, count: number):Promise<Buffer>  {
        if (this.state != State.Opened) {
            return Promise.reject("Invalid state", {state: this.state} );
        }
         

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
         
        return this.addToTaskQueue(buffer, expectedDataCount);
    }


    readHoldingRegisters(slave: number, address: number, count: number):Promise<Buffer>  {
         
         return this.readRegistersInternal(slave, 3, address, count);
    }

    readInputRegisters(slave: number, address: number, count: number):Promise<Buffer>  {
             
            return this.readRegistersInternal(slave, 4, address, count);
    }


    readCoils(slave: number, address: number, count: number):Promise<Buffer>  {
            
            return this.readCoilsInternal(slave, 1, address, count);
    }

    readDiscreteInputs(slave: number, address: number, count: number):Promise<Buffer>  {
            
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

 
        dataBuffer.copy(buffer, 7, 0);
   
        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
        
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
 
        dataBuffer.copy(buffer, 7, 0);
    
        var crc = crc16_modbus(buffer, buffer.length - 2);

        buffer[buffer.length - 2] = crc & 0x00ff;
        buffer[buffer.length - 1] = (crc & 0xff00) >> 8;
         
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
        
        var __this = this;
        //slave (1), FC (1), Address (2), value writen (2) crc (2)
        var expectedDataCount = 8;
        
        return this.addToTaskQueue(buffer, expectedDataCount);
    }


}