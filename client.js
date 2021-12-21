const pm2 = require('pm2')
const osu = require('node-os-utils');
const { io } = require("socket.io-client");

const exec = require("child_process").exec

const socket = io("http://monitor.obotrons.net:3000",{});
var sendermessage = false


function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
      var iface = interfaces[devName];
  
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
          return alias.address;
      }
    }
    return '0.0.0.0';
}
  

async function main(){
    var content_servers = false

    function get_resource(){
        var node_service = []
        var host = getIPAddress()

        pm2.connect(async function(err){
            content_servers = (err)? false : true

            pm2.list(async function(err,list_pm2){    
                content_servers = (err)? false : true
                
                // get status nginx
                exec('sudo service nginx status', async(error,stdout,stderr) => {
                    list_pm2.forEach(process_node => {
                        node_service.push({'name' : process_node['pm2_env']['name'], 'status' : process_node['pm2_env']['status'] })
                    });
                    // post data to host
                    const mem = await osu.mem.info()
                    const cpu = await osu.cpu.usage()
        
                    const data = {
                        'host' : host,
                        'cpu' : cpu,
                        'memory' : mem['usedMemPercentage'],
                        'node_service' : node_service,
                        'nginx' : stdout.includes('active (running)'), // stop = inactive (dead) , start = active (running)
                        'time' : Date.now()
                    }
    
                    socket.emit('send_status',data)
    
    
                    //end programd
                    pm2.disconnect()                     
                })
            })
        })
    }

    // loop every 2 secount
    while(true){
        get_resource()
        await new Promise(r => setTimeout(r,30 * 1000))
    }
}   


socket.on('connect',function(data) {
    //run app.js
    console.log(`connecttion data `)
    //start socket

    socket.on('assign_sender',function(){
        sendermessage = true
        console.log('be sender')
    })

    socket.emit('send_status',{
        'host' : getIPAddress(),
        'cpu' : 0,
        'memory' :0,
        'node_service' : [],
        'time' : Date.now()
    })
    main()
});

socket.on('disconnect',() => {
    console.log(`connecttion data `)
    console.log(socket.id)
})

socket.on('reconnect',() => {
     sendermessage = false
})

socket.on("connect_error", (error) => {
    if(sendermessage){
        send_message(`Big Servers Down dont can connect`)
        sendermessage = false
        setTimeout(() => {
            sendermessage = true
        }, 1000 * 60 * 5);
    }
    console.log('error',error)
  });

// line notify message
const send_message = (message) => {
    var axios = require('axios');
    var qs = require('qs');
    var data = qs.stringify({
      'message': message 
    });
    var config = {
      method: 'post',
      url: 'https://notify-api.line.me/api/notify',
      headers: { 
        'Authorization': 'Bearer B6yPj7gOCjsVuhn9MhZjbYgqwwcnM3AxrQRhDtt3MvU', 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data : data
    };
  
    axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
  
    console.log('sended message')
}


