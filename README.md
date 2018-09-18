# Node-mi-flora


Node-Mi-Flora e-agent gateway startup guide

## Getting Started

To properly configure your Node-Mi-Flora e-agent gateway you will follow theses steps :

### Prerequisites

#### Wifi
You need to be connected to Network !

If you will use a Ethernet cable to connect your Raspberry Pi (or linux computer) to the internet, you can skip this step.

Start by scanning for wireless networks:

```
sudo iwlist wlan0 scan
```

This will list all of the available WiFi networks.

Now, to configure correctly your wifi network you need to open the wpa-supplicant file :

```
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Add the following to the bottom of the file, don't forget to change `wifiName` by your SSID and `wifiPassword` by your wifi secure key.

```
network={
  ssid="wifiName"
  psk="wifiPassword"
}
```

### Installation

You need to install `npm` and `nodejs` to compile the program by run these command lines (Don't forget to type your password if asked.)

```
sudo -s
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
apt-get install -y nodejs build-essential
```

## Installing

A step by step series of instruction prepare and install the program.

First, need to clone the project files into your hard-drive.
Please make sur you're into the folder that will contain all files of the project and run this :

```
sudo -s
git clone git@github.com:fcadet01/node-mi-flora.git /opt/e-agent && cd /opt/e-agent
```

Now, you can install e-agent just by run :

```
npm install
```
We use `pm2` to let the e-agent running at startup.
To install and use it, just run this commands : 

```
npm i -g pm2
```

## Running the gateway

To run the automated tests on your system you can just follow these instructions :

### Run e-agent 

You can run e-agent application just by typing this command :

```
pm2 start bin/start.json
```

It will not show you the output in the console.
If you want to have this log output, you can run this command :

```
pm2 logs
```

## Versioning

We use [Github](http://github.com/) for versioning. 

## Authors

* [Florian BERTONNIER](https://git.univ-lr.fr/u/fbertonn/)
* [Flavien CADET](http://github.com/fcadet01/)

See also the list of [contributors](https://github.com/fcadet01/node-mi-flora/graphs/contributors) who participated in this project.
