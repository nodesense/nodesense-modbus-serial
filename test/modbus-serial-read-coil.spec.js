
var sinon = require('sinon');
var chai = require('chai');

require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('readCoils Test', function() {
   
    it("readCoils Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                
                modbusSerialPort.readCoils(1, 0, 20).then(function(outputBuffer){
                    console.log("received  readCoils in promise ", outputBuffer);
                    
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x01, 0x03, 0xaf, 0xaa, 0x0a, 0xf2, 0xc8]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(new Buffer([0x01, 0x01, 0x03, 0xaf, 0xaa, 0x0a, 0xf2, 0xc8]));
                  }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });


    it("readDiscreteInputs Test", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                
                modbusSerialPort.readDiscreteInputs(1, 0, 20).then(function(outputBuffer){
                    console.log("received  readDiscreteInputs in promise ", outputBuffer);
                     
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x02, 0x03, 0xaa, 0xaa, 0x0a, 0xa6, 0xc9]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                setTimeout(function(){
                    if (modbusSerialPort.serialPort != null) {
                        console.log("**Got serial port object**");
                        modbusSerialPort.serialPort.writeToComputer(new Buffer([0x01, 0x02, 0x03, 0xaa, 0xaa, 0x0a, 0xa6, 0xc9]));
                  }
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });

});


 
