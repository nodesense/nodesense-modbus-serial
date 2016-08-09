import {ModbusSerialPort} from "./modbus-serial";


console.log(process.argv.length);

if (process.argv.length < 3)
{
    console.log("needed port name ");
    process.exit(0);
}

console.log(process.argv);
///dev/ttys002
var PORT = process.argv[2];
 

let modbusClient = new ModbusSerialPort(PORT);  


modbusClient.connect().then(function(){
    
    console.log("done");
    
    /*
   var addInterval = setInterval(function(){
        modbusClient.readHoldingRegisters(1, 0, 10).then(function(data){
            console.log("received in promise ", data);
        })
    }, 5000);
   
    */

   var addInterval =  setInterval(function(){
        modbusClient.readInputRegisters(1, 0, 10).then(function(data){
            console.log("received input registers in promise ", data);
        })
    }, 5000);
    
   
    /*

   
     var addInterval = setInterval(function(){
        modbusClient.readCoils(1, 0, 20).then(function(data){
            console.log("received  coils in promise ", data);
        }, function(err){
            console.log("Yeah, promise failed ", err);
        })
     }, 1000);


  var addInterval = setInterval(function(){
        modbusClient.readDiscreteInputs(1, 0, 20).then(function(data){
            console.log("received  readDiscreateInputs in promise ", data);
        })
    }, 5000);
  */

   /*
   
     var addInterval =  setInterval(function(){
        var buffer = Buffer.alloc(4, 2); 
        modbusClient.writeMultipleRegisters(1, 0, buffer).then(function(data){
            console.log("received  writeMultipleRegisters in promise ", data);
        })
    }, 8000);
       
 

    var addInterval = setInterval(function(){
        var bitBuffer = Buffer.alloc(4, 1); 
        modbusClient.writeMultipleCoils(1, 0, bitBuffer).then(function(data){
            console.log("received  writeMultipleCoils in promise ", data);
        })
    }, 5000);
    
*/
       /*
       
  
    var addInterval = setInterval(function(){
        var bitBuffer = Buffer.alloc(4, 1); 
        modbusClient.writeSingleRegister(1, 0, 3).then(function(data){
            console.log("received  writeSingleRegister in promise ", data);
        })
    }, 2000);
  
    
    var addInterval =setInterval(function(){
        var bitBuffer = Buffer.alloc(4, 1); 
        modbusClient.writeSingleCoil(1, 0, false).then(function(data){
            console.log("received  writeSingleCoil in promise ", data);
        })
    }, 5000);
    */
    var closeInterval = setInterval(function(){
        clearInterval(addInterval);
        clearInterval(closeInterval);
        
        modbusClient.close();
     }, 30000);


   
}, function(err){
    console.log("Could not open port ", err);
})
 