
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Read Registers Test', function() {
   
    it("Read Holding Registers Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                
                modbusSerialPort.readHoldingRegisters(1, 0, 10).then(function(outputBuffer){
                    console.log("received  readHoldingRegisters in promise ", outputBuffer);
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x03, 0x14, 0x02, 0x02, 0x02, 0x02, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0x9c, 0x43]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(new Buffer(  [0x01, 0x03, 0x14, 0x02, 0x02, 0x02, 0x02, 0x00, 0x02,
                         0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0x9c, 0x43]));
                  }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });
 

 
    it("Read Input Registers Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                modbusSerialPort.readInputRegisters(1, 0, 10).then(function(outputBuffer){
                    console.log("received  readInputRegisters in promise ", outputBuffer);
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x04, 0x14, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02,
                     0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0xfb, 0xb7]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(new Buffer(  [0x01, 0x04, 0x14, 0x00, 0x00, 0x00, 0x01, 
                        0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0xfb, 0xb7]));
                  }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });
 

});


 
