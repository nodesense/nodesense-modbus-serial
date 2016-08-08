
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Write Coil(s) Tests', function() {
   
    it("Write Single Coil Test", function (done) {
             
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
   
                //var bitBuffer = Buffer.alloc(4, 1); 
                modbusSerialPort.writeSingleCoil(1, 0, false).then(function(outputBuffer){
                     expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x05, 0x00, 0x00, 0x00,  0x00, 0xcd, 0xca]));
                     done();
                }, function(err){
                    expect(true).to.be(false);
                     done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(new Buffer([0x01, 0x05, 0x00, 0x00, 0x00,  0x00, 0xcd, 0xca]));
                    }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });


    it("Write Multiple Coils Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                var buffer = Buffer.alloc(4, 1); 

                modbusSerialPort.writeMultipleCoils(1, 0, buffer).then(function(outputBuffer){
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x0f, 0x00, 0x00, 0x00, 0x04, 0x54, 0x08]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        modbusSerialPort.serialPort.writeToComputer(new Buffer([0x01, 0x0f, 0x00, 0x00, 0x00, 0x04, 0x54, 0x08]));
                    }
                }, 1000);
                
            }, function(err){
                expect(true).to.equal(false);
                done();
            })
    });



});


 
