
var Board = new Meteor.Collection("board");
var CommandLog = new Meteor.Collection("commandlog");
var Ad = new Meteor.Collection("ad");

if (Meteor.isClient) {

	function vnc_resize(rfb, width, height) {

		if(typeof width != 'undefined' && typeof height != 'undefined')
			rfb.get_display().resize(width, height)
		if(rfb === undefined)
			rfb = NoVnc.rfb
		var scale = 1;
		var esize = {
			width: document.getElementById("vnc").offsetWidth,
			height: document.getElementById("vnc").offsetHeight
		}
		var ssize = {
			width: rfb._fb_width,
			height: rfb._fb_height,
			real_width: rfb._fb_width * rfb.get_display().get_scale(),
			real_height: rfb._fb_height * rfb.get_display().get_scale()
		}
		if(esize.width - ssize.width <= esize.height - ssize.height && ssize.height * esize.width/ssize.width < esize.height) {
			scale = esize.width / ssize.width
		}
		else {
			scale = esize.height / ssize.height
		}
		if (scale > 1) scale = 1.0;
		rfb.get_display().set_scale(scale)
		rfb.get_mouse().set_scale(scale)
		NoVnc.size.set({width: ssize.width * scale, height: ssize.height * scale})
	}
	NoVnc.rfb.set_onFBResize(vnc_resize)
	window.addEventListener("resize", vnc_resize)
	
	Session.set("cpu", []);
	
	var AD_CHANGE_TIME = 30000;
	var GARBAGE_TIME = 150000;
	
	window.Board = Board;
	window.CommandLog = CommandLog;
	window.Ad = Ad;
	
	
	Template.bulletinboard.helpers({
		item: function(){ return Board.find() }
	})
	
	
	
	Template.commandlog.helpers({
		item: function(){ return CommandLog.find({}, {sort: {time: -1}}) }
	})
	
	Meteor.setInterval(function(){
		CommandLog.find({time: {$lt: +new Date() - GARBAGE_TIME}}).forEach(function(old){
			CommandLog.remove(old._id);
		})
	}, 2000)
	
	
	Template.ad.onRendered(function(){
		Meteor.setTimeout(function(){
			Session.set("ad_url", rand_ad())
		}, 1000);
	})
	Template.ad.helpers({
		ad_url: function(){ return Session.get("ad_url")}
	})
	
	function rand_ad(){
		var array = Ad.find().fetch();
		if (array.length > 0){
			var randomIndex = Math.floor( Math.random() * array.length );
			return array[randomIndex].url;
		} else return "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=";
	}
	
	Meteor.setInterval(function(){
		Session.set("ad_url", rand_ad())
	}, AD_CHANGE_TIME)
	
	
	Template.status.helpers({
		cpu: function(){ return Session.get("cpu") }
	})
	
	Meteor.setInterval(function(){
		Meteor.call("cpuInfo", function(err, ret){
			if (err){
				console.info(err);
			} else {
				Session.set("cpu", ret);
				console.info(ret)
			}
		})
	}, 2000)
	
	Template.clock.helpers({
		time: function(){ return Session.get("time") }
	})
	
	Meteor.setInterval(function(){
		Session.set("time", moment().format("MMMM Do, h:mm:ss"));
	},1000)
	
}




if (Meteor.isServer){
	var EXEC = "/home/yamamushi/twitch-master/init.sh";
	var EARG = ["client_status"];
	
	var require = Npm.require;
	
	Meteor.startup(function () {
		
		var spawn = require('child_process').spawn;
		var status = spawn(EXEC, EARG);
	
		status.stdout.on('data', Meteor.bindEnvironment(function(data){
			CommandLog.insert({
				message: data.toString().replace("Winning command ", ""),
				time: +new Date()
			})
		}));

		status.stderr.on('data', Meteor.bindEnvironment(function(data){
			console.log('stderr: ' + data.toString());
		}));
		
		
		
	});
	
	
	var os = require("os");
	
	Meteor.methods({
		cpuInfo: function(){
			
			var ret = []
			var cpus = os.cpus();
			for(var i = 0, len = cpus.length; i < len; i++) {
				var cpu = cpus[i], total = 0;
				for(var type in cpu.times){
					if (type != "idle"){
						total += cpu.times[type];
					}
				}
				var idle = cpu.times["idle"];
				var percent = 100 * total / idle;
				ret.push(parseInt(percent))
			}
			return ret;
		}
	})
	
	
}

