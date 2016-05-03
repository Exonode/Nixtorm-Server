/**************************************
	Development room commands.
**************************************/
'use strict';

const requestsFile = '../pullrequests.json';

var fs = require("fs");

global.pullRequests = {};

if (!fs.existsSync(requestsFile))
	fs.writeFileSync(requestsFile, JSON.stringify(pullRequests));

pullRequests = JSON.parse(fs.readFileSync(requestsFile));

function writePullRequestsData() {
	fs.writeFileSync(requestsFile, JSON.stringify(pullRequests));
}

if (!pullRequests.idNum) {
	pullRequests.idNum = 1;
	writePullRequestsData();
}

let whitelist = ['thesakurai'];

let linkCheck = function (link) {
	if(link.substring(0, 20) === 'http://hastebin.com/') {
		if (link.length > 20) return true;
	} else return false;
};
let checkLoc = function (loc) {
	let lowerLoc = loc.toLowerCase();
	if (lowerLoc.substring(0, 6) === 'server') {
		return true;
	} else return false;
};
let pendingRequests = function (bin, loc, desc, id, issuer, status) {
	this.bin = bin;
	this.loc = loc;
	this.desc = desc;
	this.id = id;
	this.issuer = issuer;
	this.status = status;
	this.assignedTo = null;
};
exports.commands = {
	pull: 'pullrequest',
	pullrequest: {
		o: 'open',
		open: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (!target) return this.parse('/help pullrequest open');
			target = target.split(',');
			if (!linkCheck(target[0])) {
				if (!user.can('forcewin') && !(target[0] === 'http://hastebin.com/')) {
					let whitelisted = false;
					for (let i = 0; i < whitelist.length; i++) {
						if(whitelist[i] === user.userid) whitelisted = true;
					}
					if(!whitelisted) return this.errorReply("The link must start with http://hastebin.com/");
				}
			}
			target[1] = target[1].replace(/\s+/g, '');
			if (checkLoc(target[1])) return this.errorReply("The location automatically has server/spacialgaze/ added to it. Don't start your selected location with that.");
			this.broadcasting = true;
			this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + target[0] + '" style="color:orange">#' + pullRequests.idNum + '</a> ' + user.name + ' opened a pull request to <span style="color:blue">server/spacialgaze/' + target[1] + '</span><br/>' + target[2] + '</div>');
			let idStr = pullRequests.idNum.toString();
			pullRequests[idStr] = new pendingRequests(target[0], target[1], target[2], pullRequests.idNum, user.userid, 'open');
			pullRequests.idNum++;
			writePullRequestsData();
		},
		openhelp: ["/pullrequest open [hastebin link], [file location], [description] - creates a new pull request to [file location] with [hastebin link] as the code."],
		v: 'view',
		view: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!target) {
				//log the last 5 PR's
				let i = (pullRequests.idNum - 1);
				for (i; i > (pullRequests.idNum - 6); i--) {
					if (i <= 0) break;
					let strI = i.toString();
					if (pullRequests[strI] === undefined) continue;
					let statusColor;
					switch(pullRequests[strI].status) {
						case 'open': statusColor = 'lime';
							break;
						case 'closed': statusColor = 'red';
							break;
						case 'merged': statusColor = 'yellow';
							break;
					}
					this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server -> ' + user.name + '</span>] <a href="' + pullRequests[strI].bin + '" style="color:orange">#' + pullRequests[strI].id + '</a> [<span style="text-transform:capitalize; color:' + statusColor + '">' + pullRequests[strI].status + '</span>] ' + pullRequests[strI].issuer + '\'s pull request to <span style="color:blue">server/spacialgaze/' + pullRequests[strI].loc + '</span><br/>' + pullRequests[strI].desc + '</div>');
				}
			} else {
				if (pullRequests[target] === undefined) return this.errorReply("The pull request you are looking for does not exist.");
				let statusColor;
				switch(pullRequests[target].status) {
					case 'open': statusColor = 'lime';
						break;
					case 'closed': statusColor = 'red';
						break;
					case 'merged': statusColor = 'yellow';
						break;
				}
				this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server -> ' + user.name + '</span>] <a href="' + pullRequests[target].bin + '" style="color:orange">#' + pullRequests[target].id + '</a> [<span style="text-transform:capitalize; color:' + statusColor + '">' + pullRequests[target].status + '</span>] ' + pullRequests[target].issuer + '\'s pull request to <span style="color:blue">server/spacialgaze/' + pullRequests[target].loc + '</span><br/>' + pullRequests[target].desc + '</div>');
			}
		},
		viewhelp: ["/pullrequest view [id] - view the list of pull requests, if [id] is provided view that sespific request."],
		u: 'update',
		update: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (!target) return this.parse('/help pullrequest update');
			target = target.split(',');
			if(target.length <= 1) return this.errorReply('You either didn\'t specify a link or forgot a comma.');
			target[1] = target[1].replace(/\s+/g, '');
			if (target[1] === undefined) return this.errorReply("You must specify a link.");
			if (pullRequests[target[0]] === undefined) return this.errorReply("The pull request you are looking for does not exist.");
			if (pullRequests[target[0]].issuer !== user.userid) {
				if (pullRequests[target[0]].assignedTo !== user.userid) return this.errorReply("You cannot update a pull request that you did not create.");
			}
			if (pullRequests[target[0]].status !== 'open') return this.errorReply("You cannot update a pull request that isn\'t open.");
			if (!linkCheck(target[1])) {
				if (!user.can('forcewin') && !(target[1] === 'http://hastebin.com/')) {
					let whitelisted = false;
					for (let i = 0; i < whitelist.length; i++) {
						if(whitelist[i] === user.userid) whitelisted = true;
					}
					if(!whitelisted) return this.errorReply("The link must start with http://hastebin.com/");
				}
			}
			pullRequests[target[0]].bin = target[1];
			writePullRequestsData();
			this.broadcasting = true;
			this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + pullRequests[target[0]].bin + '" style="color:orange">#' + pullRequests[target[0]].id + '</a> ' + user.name + ' updated thier pull request to <span style="color:blue">server/spacialgaze/' + pullRequests[target[0]].loc + '</span><br/>' + pullRequests[target[0]].desc + '</div>');
		},
		updatehelp: ["/pullrequest update [id], [hastebin link] - updates the pull request with the matching [id], by changing the code to [hastebin link]. Requires: you to be the issurer of the pull request ||OR|| &, ~"],
		c: 'close',
		close: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (!target) return this.parse('/help pullrequest close');
			if (pullRequests[target] === undefined) return this.errorReply("The pull request you are looking for does not exist.");
			if (pullRequests[target].issuer !== user.userid) {
				let whitelisted = false;
				for (let i = 0; i < whitelist.length; i++) {
					if(whitelist[i] === user.userid) whitelisted = true;
				}
				if (!whitelisted) if (!user.can('forcewin')) return this.errorReply("You cannot close a pull request that you did not create.");
			}
			if (pullRequests[target].status !== 'open') return this.errorReply("You cannot close a pull request that isn\'t open.");
			pullRequests[target].status = 'closed';
			writePullRequestsData();
			this.broadcasting = true;
			this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + pullRequests[target].bin + '" style="color:orange">#' + pullRequests[target].id + '</a> ' + user.name + ' closed ' + pullRequests[target].issuer + '\'s pull request to <span style="color:blue">server/spacialgaze/' + pullRequests[target].loc + '</span><br/>' + pullRequests[target].desc + '</div>');
		},
		closehelp: ["/pullrequest close [id] - closes a pull request without merging it to the server. Requires: you to be the issurer of the pull request ||OR|| &, ~"],
		m: 'merge',
		merge: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (!target) return this.parse('/help pullrequest merge');
			if (pullRequests[target] === undefined) return this.errorReply("The pull request you are looking for does not exist.");
			let whitelisted = false;
			for (let i = 0; i < whitelist.length; i++) {
				if(whitelist[i] === user.userid) whitelisted = true;
			}
			if (!whitelisted) if (!user.can('forcewin')) return this.errorReply(cmd + " - Access Denied.");
			if (pullRequests[target].status !== 'open') return this.errorReply("You cannot merge a pull request that isn\'t open.");
			pullRequests[target].status = 'merged';
			writePullRequestsData();
			this.broadcasting = true;
			this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + pullRequests[target].bin + '" style="color:orange">#' + pullRequests[target].id + '</a> ' + user.name + ' merged ' + pullRequests[target].issuer + '\'s pull request to <span style="color:blue">server/spacialgaze/' + pullRequests[target].loc + '</span><br/>' + pullRequests[target].desc + '</div>');
		},
		mergehelp: ["/pullrequest merge [id] - closes a pull request and merges it into the server. Requires: &, ~"],
		assign: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			let whitelisted = false;
			for (let i = 0; i < whitelist.length; i++) {
				if(whitelist[i] === user.userid) whitelisted = true;
			}
			if (!whitelisted) if (!user.can('forcewin')) return this.errorReply(cmd + " - Access Denied.");
			if (!target) return this.parse("/help pullrequest assign");
			target = toId(target);
			target = target.split(',');
			if (pullRequests[target[0]] === undefined) return this.errorReply("The pull request you are looking for does not exist.");
			if (pullRequests[target[0]].status !== 'open') return this.errorReply("You cannot assign a pull request that isnt open.");
			if (pullRequests[target[0]].assignedTo === pullRequests[target[0]].issuer) return this.errorReply("You cannot assign a pull request to the issuer.");
			if (pullRequests[target[0]].assignedTo === target[1]) return this.errorReply(target[1] + " is already assigned to the pull request!");
			if (pullRequests[target[0]].assignedTo !== null) {
				if (target[2] !== 'force') return this.sendReply("This pull request is already assigned to " + pullRequests[target[0]].assignedTo + ". If you want to change it use: /pullrequest assign " + target[0] + ", " + target[1] + ", force");
				pullRequests[target[0]].assignedTo = target[1];
				this.sendReply("Pull Request assigned to " + target[1] + ".");
				this.broadcasting = true;
				writePullRequestsData();
				return this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + pullRequests[target[0]].bin + '" style="color:orange">#' + pullRequests[target[0]].id + '</a> ' + user.name + ' assigned ' + pullRequests[target[0]].issuer + '\'s pull request to ' + target[1] + '<br/>' + pullRequests[target[0]].desc + '</div>');
			}
			pullRequests[target[0]].assignedTo = target[1];
			this.sendReply("Pull Request assigned to " + target[1] + ".");
			this.broadcasting = true;
			writePullRequestsData();
			return this.sendReplyBox('<div style="border:1px solid purple">[<span style="color:lime">Server</span>] <a href="' + pullRequests[target[0]].bin + '" style="color:orange">#' + pullRequests[target[0]].id + '</a> ' + user.name + ' assigned ' + pullRequests[target[0]].issuer + '\'s pull request to ' + target[1] + '<br/>' + pullRequests[target[0]].desc + '</div>');
		},
		assignhelp: ["/pullrequest assign [id], [user] - Assigns a pull request to another user allowing that user AND the creator to update the pull request. Only one user may be assigned to each pull request. Requires &, ~"],
		d: 'delete',
		delete: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			let whitelisted = false;
			for (let i = 0; i < whitelist.length; i++) {
				if(whitelist[i] === user.userid) whitelisted = true;
			}
			if (!whitelisted) if (!user.can('forcewin')) return this.errorReply(cmd + " - Access Denied.");
			if (!target) return this.parse("/help pullrequest delete");
			if (!pullRequests[target]) return this.errorReply("The pull request you are looking for does not exist.");
			delete pullRequests[target];
			return this.sendReply("Pull Request Deleted.");
		},
		deletehelp: ["/pullrequest delete [id] - deletes a pullrequest from the records. Requires: &, ~"],
		reset: function (target, room, user, connection, cmd, message) {
			if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			let whitelisted = false;
			for (let i = 0; i < whitelist.length; i++) {
				if(whitelist[i] === user.userid) whitelisted = true;
			}
			if (!whitelisted) if (!user.can('lockdown')) return this.errorReply(cmd + " - Access Denied.");
			if (!target || target !== 'force') return this.sendReply("WARNING. Reseting pull requests deletes ALL OPEN, CLOSED, AND MERGED pull requests from server memory. If your sure you want to do this use /pullrequest reset force");
			for (let i = pullRequests.idNum; i > 0; i--) {
				if (pullRequests[i]) delete pullRequests[i];
			}
			pullRequests.idNum = 1;
			return this.sendReply("Pull Requests Reset.")
		},
		'': function (target, room, user, connection, cmd, message) {
			return this.parse('/help pullrequest');
		}
	},
	pullrequesthelp: ["Allows users to submit code contributions to the staff. Users do this via hastebin.",
				"Accepts the following commands:",
				"/pullrequest open [hastebin link], [file location], [description] - creates a new pull request to [file location] with [hastebin link] as the code.",
				"/pullrequest view [id] - view the list of pull requests, if [id] is provided view that sespific request.",
				"/pullrequest update [id], [hastebin link] - updates the pull request with the matching [id], by changing the code to [hastebin link]. Requires: PR Issuer",
				"/pullrequest close [id] - closes a pull request without merging it to the server. Requires: PR Issuer ||OR|| &, ~",
				"/pullrequest merge [id] - closes a pull request and merges it into the server. Requires: &, ~",
				"/pullrequest assign [id], [user] - Assigns a pull request to another user allowing that user AND the creator to update the pull request. Only one user may be assigned to each pull request. Requires &, ~",
				"/pullrequest delete [id] - deletes a pullrequest from the records. Requires: &, ~"],
	push: 'pushcommit',
	pushcommit: function (target, room, user, connection, cmd, message) { 
		if (room.id !== 'development') return this.errorReply("This command can only be used in development.");
		if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
		if (!target) return this.parse('/help pushcommit');
		let whitelisted = false;
		for (let i = 0; i < whitelist.length; i++) {
			if(whitelist[i] === user.userid) whitelisted = true;
		}
		if (!whitelisted) if (!user.can('lockdown')) return this.errorReply(cmd + " - Access Denied.");
		target = target.split(',');
		target[0] = target[0].replace(/\s+/g, '');
		target[1] = target[1].replace(/\s+/g, '');
		if (!linkCheck(target[0])) {
			if (target[0] !== '') return this.errorReply("The link must start with http://hastebin.com/");
			target[0] = 'http://hastebin.com/';
		}
		if (checkLoc(target[1])) return this.errorReply("The location automatically has server/spacialgaze/ added to it. Don't start your selected location with that.");
		this.broadcasting = true;
		this.sendReplyBox('<div style="border: 1px solid purple">[<span style="color:lime">Server</span>] <a style="color:orange" href="' + target[0] + '">#' + pullRequests.idNum + '</a> ' + user.name + ' pushed a commit to <span style="color:blue">server/spacialgaze/' + target[1] + '</span><br/>' + target[2] + '</div>');
		let idStr = pullRequests.idNum.toString();
		pullRequests[idStr] = new pendingRequests(target[0], target[1], target[2], pullRequests.idNum, user.name, 'merged');
		pullRequests.idNum++;
		writePullRequestsData();
	},
	pushcommithelp: ["/pushcommit [hastebin link], [location], [description] - Merge code directly to the server, Leave [hastebin link] blank to not provide code. Requires: ~"],
};