import usb.core
import usb.util
import socket
import time

# VID dan PID printer kamu
PRINTER_VID = 0x28E9
PRINTER_PID = 0x0289

def connect_printer():
    dev = usb.core.find(idVendor=PRINTER_VID, idProduct=PRINTER_PID)
    print(dev)  # Ini akan print <DEVICE ...> jika ditemukan

    if dev is None:
        print("Printer not found.")
        return None

    try:
        if dev.is_kernel_driver_active(0):
            dev.detach_kernel_driver(0)
    except Exception:
        pass

    try:
        dev.set_configuration()
        cfg = dev.get_active_configuration()
        intf = cfg[(0, 0)]

        ep_out = usb.util.find_descriptor(
            intf,
            custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
        )

        return dev, ep_out
    except Exception as e:
        print(f"Failed to set up USB: {e}")
        return None

def raw_write(dev, ep_out, data: bytes):
    try:
        ep_out.write(data)
        return True
    except Exception as e:
        print(f"Write error: {e}")
        return False

def print_ticket(queue_number):
    result = connect_printer()
    if not result:
        print("Printer not available.")
        return

    dev, ep_out = result

    # ESC/POS raw commands
    content = b""
    content += b"\n\n"
    content += b"\x1b\x61\x01"  # Align center
    content += b"\x1b\x21\x30"  # Double width & height, font B
    content += b"Line 1\n" #Edit line 1
    content += b"----------------\n"
    content += f"NO. ANTRIAN\n{queue_number}\n".encode()
    content += b"----------------\n"
    content += b"Terima kasih\n"
    content += b"\n\n\n"
    content += b"\x1d\x56\x00"  # Full cut

    if raw_write(dev, ep_out, content):
        print(f"Successfully printed: {queue_number}")
    else:
        print("Print failed.")

    usb.util.dispose_resources(dev)

def start_server():
    HOST = '0.0.0.0'
    PORT = 8080

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(1)
        print(f"Server running on port {PORT}...")

        while True:
            conn, addr = s.accept()
            try:
                data = conn.recv(1024).decode().strip()
                if data.startswith("PRINT:"):
                    queue_num = data.split(":")[1]
                    print(f"Received: {queue_num}")
                    print_ticket(queue_num)
            except Exception as e:
                print(f"Error: {e}")
            finally:
                conn.close()

if __name__ == "__main__":
    start_server()
