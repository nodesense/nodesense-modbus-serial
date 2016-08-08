# nodesense-modbus-serial

Modbus Serial RTU Implementation for Node.js. A performance driven Modbus RTU implementation for Data Acqusition over Sensors, Edge Devices with Serial Port support (RS-232/RS 485).

Features
========

* Request Queues using async/queue, Support multiple requests, Requests are queued, executed one by one.
* Promises for Read/Write APIs
* Modbus RTU support for most used Modbus Function codes
* Retry if no response from client
* Supports Read Multiple Coils, Discrete Inputs, Multile Holding Registers, Multiple Input Registers, Write single coil, single register, write multiple coils and multiple registers

TODOs
=====

* Validate CRC after receiving data, before responding data. If CRC fails, it must be rescheduled with retry loop
* Test on real RS-232, RS-485 Serial Ports, USB. Right now, test is done using socat port simulator, using Python modbus_tk libary
* Release management, releases using ES5
* Adding more Modbus Funcion one per week, expected to support all Modbus Function codes by November 2016
* Parse and respond with Modbus parsed data, rather than returning raw buffer
* Test on Windows, Linux, Raspberry PI and Intel Edison


Dependencies
============

* https://github.com/caolan/async
* https://github.com/petkaantonov/bluebird


Testing
=======

* https://github.com/mochajs/mocha
* https://github.com/chaijs/chai