# nodesense-modbus-serial

Modbus Serial Port Implementation for Node.js. A performance driven Modbus RTU implementation with below features.
Here is the goal for nodesense-modbus-serial port.

1. Request Queues using async/queue
2. Promises for Read/Write APIs
3. Modbus RTU support for most used Modbus Function codes, with promise of meeting 100% Modbus Specs in coming months
4. Targetting IIoT, IoT Data Acquisition over Modbus
5. Written on top on node serial-port implementation, support Linux, Mac, Windows, Raspberry PIs and Intel Edison
6. Implemented using TypeScript, ES6, transpile to ES4 or ES5 to run on Node.js less than 4.x
7. Using bluebird promises to boost the JavaScript performace, reduce memory usage



