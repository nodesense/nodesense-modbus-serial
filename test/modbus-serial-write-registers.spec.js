
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Write Registers Test', function() {
   

    it("Write Single Register Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                
                modbusSerialPort.writeSingleRegister(1, 0, 3).then(function(outputBuffer){
                    console.log("received  writeSingleRegister in promise ", outputBuffer);
                    expect(outputBuffer).to.deep.equal(Buffer.from([0x01, 0x06, 0x00, 0x00, 0x00, 0x03,  0xc9, 0xcb]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(Buffer.from([0x01, 0x06, 0x00, 0x00, 0x00, 0x03,  0xc9, 0xcb]));
                    }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });



    it("Write Multiple Registers Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                var buffer = Buffer.alloc(4, 2);

                modbusSerialPort.writeMultipleRegisters(1, 0, buffer).then(function(outputBuffer){
                    expect(outputBuffer).to.deep.equal(Buffer.from([0x01, 0x10, 0x00, 0x00, 0x00,  0x02, 0x41, 0xc8]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        modbusSerialPort.serialPort.writeToComputer(Buffer.from([0x01, 0x10, 0x00, 0x00, 0x00,  0x02, 0x41, 0xc8]));
                    }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                done();
            })
    });

 

});


 
