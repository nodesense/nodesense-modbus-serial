
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Serial Port Master Options', function() {
   

    it("Serial Port Master Default Options", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            
            expect(modbusSerialPort.masterOptions.MAX_RETRY).to.equal(3);
            expect(modbusSerialPort.masterOptions.MAX_TIME_OUT).to.equal(2000);
           
            done();
    });

    it("Serial Port Master Options", function (done) {
            var options = {
                MAX_RETRY: 2,
                MAX_TIME_OUT: 5000 
            }

            console.log("++++++++++++++")
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists', null, options);
              
            expect(modbusSerialPort.masterOptions.MAX_RETRY).to.equal(2);
            expect(modbusSerialPort.masterOptions.MAX_TIME_OUT).to.equal(5000);
            
            

            done();
    });
});


 
