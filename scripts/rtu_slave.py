#!/usr/bin/env python
# -*- coding: utf_8 -*-
"""
 Modbus TestKit: Implementation of Modbus protocol in python

 (C)2009 - Luc Jean - luc.jean@gmail.com
 (C)2009 - Apidev - http://www.apidev.fr

 This is distributed under GNU LGPL license, see license.txt
"""

import sys

import modbus_tk
import modbus_tk.defines as cst
from modbus_tk import modbus_rtu
import serial
import argparse
    

PORT = 0
#PORT = '/dev/ptyp5'
PORT = "/dev/ttys003"




parser = argparse.ArgumentParser(description='Modbus Slave')
parser.add_argument('ports',   type=str,  
                   help='port name', nargs=1)
args = parser.parse_args()

print "First argument: %s" % args.ports

PORT = args.ports[0]

def main():
    """main"""
    logger = modbus_tk.utils.create_logger(name="console", record_format="%(message)s")
    
    #Create the server
    server = modbus_rtu.RtuServer(serial.Serial(PORT, baudrate=115200))

    try:
        logger.info("running...")
        logger.info("enter 'quit' for closing the server")

        server.start()

        slave_1 = server.add_slave(1)
        slave_1.add_block('0', cst.HOLDING_REGISTERS, 0, 100)
        values = []
        for i in range(0, 100):
            values.append(i)
        slave_1.set_values('0', 0, values)

        slave_1.add_block('2', cst.ANALOG_INPUTS, 0, 100)
        values = []
        for i in range(0, 100):
            values.append(i)

        slave_1.set_values('2', 0, values)
        

        slave_1.add_block('1', cst.COILS, 0, 100)
        values = []
        for i in range(0, 100):
            values.append(i % 2);
        slave_1.set_values('1', 0, values)

        slave_1.add_block('4', cst.DISCRETE_INPUTS, 0, 100)
        values = []
        for i in range(0, 100):
            values.append(i % 2);
        slave_1.set_values('4', 0, values)

 
        
        while True:
            cmd = sys.stdin.readline()
            args = cmd.split(' ')

            if cmd.find('quit') == 0:
                sys.stdout.write('bye-bye\r\n')
                break

            elif args[0] == 'add_slave':
                slave_id = int(args[1])
                server.add_slave(slave_id)
                sys.stdout.write('done: slave %d added\r\n' % (slave_id))

            elif args[0] == 'add_block':
                slave_id = int(args[1])
                name = args[2]
                block_type = int(args[3])
                starting_address = int(args[4])
                length = int(args[5])
                slave = server.get_slave(slave_id)
                slave.add_block(name, block_type, starting_address, length)
                sys.stdout.write('done: block %s added\r\n' % (name))

            elif args[0] == 'set_values':
                slave_id = int(args[1])
                name = args[2]
                address = int(args[3])
                values = []
                for val in args[4:]:
                    values.append(int(val))
                slave = server.get_slave(slave_id)
                slave.set_values(name, address, values)
                values = slave.get_values(name, address, len(values))
                sys.stdout.write('done: values written: %s\r\n' % (str(values)))

            elif args[0] == 'get_values':
                slave_id = int(args[1])
                name = args[2]
                address = int(args[3])
                length = int(args[4])
                slave = server.get_slave(slave_id)
                values = slave.get_values(name, address, length)
                sys.stdout.write('done: values read: %s\r\n' % (str(values)))

            else:
                sys.stdout.write("unknown command %s\r\n" % (args[0]))
    finally:
        server.stop()

if __name__ == "__main__":
    main()
