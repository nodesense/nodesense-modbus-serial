var SandboxedModule = require('sandboxed-module');

console.log("Loading sandbox");
 
var modbusSerialSandbox = SandboxedModule.require('../../dist/modbus-serial', {
  requires: {'serialport': {fake: 'virtual-serialport'}},
  globals: {myGlobal: 'variable'},
  locals: {myLocal: 'other variable'},
});
 