---
name:                     # location or role, e.g. zentrale, werk2, praxis-eg
customer:                 # id from customer.md, empty for a device without a customer
model:                    # what the device is called, according to the delivery note
hardware:                 # what the device says about itself, entered by device.mjs
os:                       # operating system, entered by device.mjs
arch:                     # architecture, entered by device.mjs
profile:                  # platform profile from the catalogue. Entered by device.mjs, only when the mirror really carries it
serial:
status: planned           # planned | delivered | installing | live | retired
verdict:                  # supported | soon | unsupported, entered by device.mjs
noted_on:                 # YYYY-MM-DD. When an unsupported device was noted down
location:                 # room, building
hostname:
address:                  # IP or name in the customer network, SSH runs over it
api_base:                 # interface, when it does not sit under address, e.g. behind a tunnel
ssh_user:                 # login name on the device
ssh_port:                 # the new port after the hardening
ssh_key:                  # name of the key in ~/.ssh, without a path
ssh:                      # ok | refused | local, result of the last check
tls:                      # selfsigned, when the device carries a self-signed certificate
docker:                   # running | present | missing
ollama:                   # present | container | missing, program or container
arasul:                   # running | traces | none, what was found on the device, not a product version
contract:                 # contract version this device carries, read by device.mjs from the device. Not a statement about the kit
net_name:                 # name under which the device appears in the customer network, set by the installer
api_key_ref:              # kit key (app:deploy) for the deploy: name of the entry, not a value
start_password_ref:       # start password from the installation: name of the entry, not a value
checked:                  # time of the last check by device.mjs
remote_access:            # none | direct | vpn
secret_ref:               # name of the entry in the secret store, not a value
license:                  # designation of the licence, not a token
maintenance_until:        # YYYY-MM-DD. End of the maintenance contract
delivered_on:
accepted_on:
---

## Surroundings

<!-- Network, address assignment, firewall, who is responsible there, particularities
     (no internet, guest network, DS-Lite, fixed address). -->

## Particularities

<!-- Everything that matters next time: tight cabinet, power only over one strip,
     key with the caretaker, contact available only on Tuesdays. -->

## Decisions

<!-- Why something was done the way it was. Survives until the extension. -->

## Checks

<!-- Written on by device.mjs: one entry per run with finding and verdict. -->
