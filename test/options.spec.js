
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;
 
describe('Serial Port Options', function() {
   

    it("serial port default options", function (done) {
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
            expect(modbusSerialPort.serialPortOptions.baudRate).to.equal(9600);
            expect(modbusSerialPort.serialPortOptions.stopBits).to.equal(1);
            expect(modbusSerialPort.serialPortOptions.parity).to.equal("none");
            expect(modbusSerialPort.serialPortOptions.autoOpen).to.equal(false);

            done();
    });


    it("serial port overwrite options", function (done) {
            var options = {
                "baudRate" : 19200,
                stopBits: 2,
                parity: 'odd',
                autoOpen: true //this should not be set
            }

            console.log("++++++++++++++")
            var modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists', options);
            
            expect(modbusSerialPort.serialPortOptions.stopBits).to.equal(options.stopBits);
            expect(modbusSerialPort.serialPortOptions.parity).to.equal(options.parity);
            expect(modbusSerialPort.serialPortOptions.autoOpen).to.equal(false);
            expect(modbusSerialPort.serialPortOptions.baudRate).to.equal(options.baudRate);


            done();
    });


});


 
