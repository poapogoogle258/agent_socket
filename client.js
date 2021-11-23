const pm2 = require('pm2')
const osu = require('node-os-utils');
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");


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
    var host = getIPAddress()


    function get_resource(){
        var node_service = []

        pm2.connect(async function(err){
            content_servers = (err)? false : true

            pm2.list(async function(err,list_pm2){    
                content_servers = (err)? false : true

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
                    'nodes' : node_service,
                    'time' : Date.now()
                }

                socket.emit('send_status',data)


                //end programd
                pm2.disconnect() 
            })
        })

    }

    // loop every 2 secount
    while(true){
        get_resource()
        await new Promise(r => setTimeout(r,2000))
    }
}


socket.on('connect',function() {
    //run app.js
    console.log(`connecttion data `)
    main()
});

socket.on('disconnect',() => {
    console.log(`connecttion data `)
    console.log(socket.id)
})



