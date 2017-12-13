"use strict";

function score(proxy, host, port){
	proxy = {
		ip: proxy.ip,
		host: proxy.host.toLowerCase(),
		port: +proxy.port,
		type: proxy.type,
		cn: proxy.isCN,
		region: proxy.region,
		hit_num: proxy.hitCount + proxy.errorCount,
		error_num: +proxy.errorCount,
		delay: +proxy.avgDelay,
		down_speed: +proxy.downloadBandwidth,
		up_speed: +proxy.uploadBandwidth,
		down_total: +proxy.totalDownloadBytes,
		up_total: +proxy.totalUploadBytes,
	};
	if(proxy.type === "heroku" || proxy.type === "shadowsocks") return -1;
	return +(Math.max(0, /^\$/.test(host) ? exec(host.slice(1), proxy) : master(proxy, host.toLowerCase(), +port)) || 0) * 1.0;
}

function exec(code, proxy){
	return eval(code);
}

function random(){
	return Math.random();
}

function spread(x){
	return x < 1 ? Math.pow(random(), x) : 1 - Math.pow(random(), 1 / x);
}

var down$up = .9969;

function limitify(x){
	return x < 0 ? -limitify(-x) : x === Infinity ? 1 : x / (1 + x);
}

function unlimitify(x){
	return x < 0 ? -unlimitify(-x) : x / (1 - x);
}

function speed(down$up, proxy){
	var rate = 1 + unlimitify(Math.abs(down$up));
	return down$up > 0
	? Math.min(proxy.down_speed, rate * proxy.up_speed) + limitify(proxy.down_speed)
	: Math.min(rate * proxy.down_speed, proxy.up_speed) + limitify(proxy.up_speed);
}

function host_down$up(host){
	var t;
	var down = 0;
	var up = 0;
	var unknown = 0;
	t = (host.match(/app/g) || []).length;
	down += t / 2;
	up += t;
	t = (host.match(/talk|ping|nav/g) || []).length;
	down += t;
	up += t / 5;
	down += (host.match(/update|archive|(?:dl)\./g) || []).length + /(?:netflix\.com|hulu\.com)$/.test(host);
	up += (host.match(/push|trans/g) || []).length;
	unknown += (host.match(/video|audio|music|media|windows|raw|file|image|software|release|resource|akamai|assets|desktop|central|code|sandai|project|vimeocdn|userstorage/g) || []).length;
	down += (host.match(/download/g) || []).length * (1 + unknown);
	up += (host.match(/upload/g) || []).length * (1 + unknown);
	return down + up ? down / (down + up) * 2 - 1 : unknown ? limitify(Math.pow(unlimitify(down$up), Math.pow(1 + unknown, .25))) : spread(Math.pow(unlimitify((1 - down$up) / 2), .077)) * 2 - 1;
}

function routine(speed, proxy){
	var t = Math.pow(down$up, 500) + 1;
	return (.5 - Math.pow(limitify(proxy.hit_num), 1e4 / Math.pow((proxy.down_speed * t + proxy.up_speed * (1 - t)) / 1.2, .4) / Math.pow(1 + proxy.error_num, .5))) * Math.pow(speed, 1.2) / 150;
}

function float(score, proxy){
	return unlimitify(Math.pow(limitify(score), unlimitify((spread(Math.pow(proxy.hit_num, .4)) + 1) / 2))) * spread(Math.pow(unlimitify(proxy.error_num / proxy.hit_num || 0) * .8, .8) * 1.5);
}

function master(proxy, host){
	var speed0 = speed(host_down$up(host), proxy) * (/^\u4E2D\u56FD-\u4E0A\u6D77-\u4E0A\u6D77-\u7535\u4fe1$/i.test(proxy.region) && (new Date).getHours() > 5 ? .15 : .85);
	return float(speed0 + routine(speed0, proxy) + 1, proxy) * (proxy.cn ? 1 : .85);
}
