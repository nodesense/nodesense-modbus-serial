
var sinon = require('sinon');
var chai = require('chai');


require("./mocks/virtualport");

var modbus_Serial = require("../dist/modbus-serial");

var assert = chai.assert;
var expect = chai.expect;


describe('Invalid State for not opened port', function() {
  var modbusSerialPort;

  beforeEach(function() { 
      modbusSerialPort = new modbus_Serial.ModbusSerialPort('/dev/exists');
  });

 it("readCoil Invalid state", function () {
        modbusSerialPort.readCoils(1, 100, 2).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
    });



 it("readHoldingRegisters Invalid state", function () {
        modbusSerialPort.readHoldingRegisters(1, 100, 2).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
    });


 

 it("readInputRegisters Invalid state", function () {
        modbusSerialPort.readInputRegisters(1, 100, 2).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
    });


 it("readDiscreteInputs Invalid state", function () {
        modbusSerialPort.readDiscreteInputs(1, 100, 2).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
    });


 
it("writeMultipleRegisters Invalid state", function () {
        modbusSerialPort.writeMultipleRegisters(1, 100, Buffer.alloc(4, 0)).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
});


it("writeMultipleCoils Invalid state", function () {
        modbusSerialPort.writeMultipleCoils(1, 100, Buffer.alloc(4, 1)).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
});


it("writeSingleRegister Invalid state", function () {
        modbusSerialPort.writeSingleRegister(1, 100, 10).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
});


it("writeSingleCoil Invalid state", function () {
        modbusSerialPort.writeSingleCoil(1, 100, true).then(function(){
             expect(true).to.equal(false);
            console.log("done");
        }, function(err){
             expect(true).to.equal(true);
            console.log("must fail ", err);
        })
});

  afterEach(function() {
      console.log("after"); 
});
});
