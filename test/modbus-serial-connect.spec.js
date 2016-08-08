
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('SerialPort ', function() {
  
  beforeEach(function() {
    
  });

    it("Port Exist Test", function (done) {
            console.log("Testing..");
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            modbusSerialPort.connect().then(function(){

                console.log("done");
                
                expect(true).to.equal(true);
                if (modbusSerialPort.serialPort != null)
                console.log("**Got serial port object**");

                done();
            }, function(err){
                expect(true).to.equal(false);
                console.log("error ", err);
                done();
            })
    });


    it("Port Not Exist Test", function (done) {
        console.log("Testing..");
        var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/not/exists');
        modbusSerialPort.connect().then(function(){

            console.log("done");
            
            expect(true).to.equal(false);
            if (modbusSerialPort.serialPort != null)
            console.log("**Got serial port object**");

            done();
        }, function(err){
            expect(true).to.equal(true);
            console.log("error ", err);
            done();
        })
});

  afterEach(function() {
   
});
});


 
