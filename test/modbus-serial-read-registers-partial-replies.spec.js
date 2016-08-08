
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Partial Data Receive ', function() {
   
    it("Send Response in 3 interval", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){
                
                modbusSerialPort.readHoldingRegisters(1, 0, 10).then(function(outputBuffer){
                    console.log("received  readHoldingRegisters in promise ", outputBuffer);
                    expect(outputBuffer).to.deep.equal(new Buffer([0x01, 0x03, 0x14, 0x02, 0x02, 0x02, 0x02, 0x00, 0x02, 0x00, 0x03, 0x00, 
                    0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0x9c, 0x43]));
                    done();
                }, function(err){
                    expect(true).to.equal(false);
                    console.log("error ", err);
                    done();
                })
                
                 var set1 = [0x01, 0x03, 0x14, 0x02, 0x02, 0x02, 0x02, 0x00, 0x02];
                var set2 = [0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06];
                var set3 = [0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0x9c, 0x43];


                setTimeout(function(){
                    modbusSerialPort.serialPort.writeToComputer(new Buffer(set1));
                    setTimeout(function(){
                        modbusSerialPort.serialPort.writeToComputer(new Buffer(set2));

                            setTimeout(function(){
                                modbusSerialPort.serialPort.writeToComputer(new Buffer(set3));                            
                            }, 200);
                            
                    }, 200);
                }, 1000);
                
                
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });
 
 

});


 
