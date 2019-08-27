'use strict';
var learnjs = {
	poolId: "ap-northeast-1:b45aad25-ea37-4dd7-85c5-60c0dbe17653"
};

learnjs.identity = new $.Deferred();

learnjs.problems = [
	{
		description: "What is truth?",
		code: "function problem() { return __; }"
	},
	{
		description: "Simple Math",
		code: "function problem() { return 42 === 6 * __; }"
	}
]

function googleSignIn(googleUser) {
	var id_token = googleUser.getAuthResponse().id_token;
	AWS.config.update({
		region: 'ap-northeast-1',
		credentials: new AWS.CognitoIdentityCredentials({
			IdentityPoolId: learnjs.poolId,
			Logins: {
				'accounts.google.com': id_token
			}
		})
	})
	function refresh(){
		return gapi.auth2.getAuthInstance().signIn({
			prompt: 'login'
		}).then(function(userUpdate){
			var creds = AWS.config.credentials;
			var newToken = userUpdate.getAuthResponse().id_token;
			creds.prams.Logins['accounts.google.com'] = newToken;
			return learnjs.awsRefresh()
		 })
	}	
	learnjs.awsRefresh().then(function(id){
		learnjs.identity.resolve({
			id: id,
			email: googleUser.getBasicProfile().getEmail(),
			refresh: refresh
		})
	})

}

learnjs.applyObject = function(obj, elm){
	for(let key in obj){
		elm.find(`[data-name="${key}"]`).text(obj[key]);
	}
}

learnjs.flashElement = function(elm, content){
	elm.fadeOut('fast', function(){
		elm.html(content);
		elm.fadeIn();
	})
}

learnjs.awsRefresh = function(){
	var deffered = new $.Deferred();
	AWS.config.credentials.refresh(function(err){
		if(err){
			deffered.reject(err);
		} else{
			deffered.resolve(AWS.config.credentials.identityId);
		}
	})
	return deffered.promise();
}


learnjs.template = function(name){
	return $(`.templates .${name}`).clone()
}

learnjs.landingView = function() {
	return learnjs.template('landing-view');
}

learnjs.triggerEvent = function(name, args) {
	$('.view-container').trigger(name, args)
}

learnjs.profileView = function(){
	var view = learnjs.template('profile-view');
	learnjs.identity.done(function(identity){
		view.find('.email').text(identity.email)
	})
	return view
}

learnjs.problemView = function(data){
	var problemNumber = parseInt(data, 10);
	var view = $('.templates .problem-view').clone();
	var problemData = learnjs.problems[problemNumber - 1];
	var resultFlash = view.find('.result')

	function checkAnswer(){
		var answer = view.find('.answer').val();
		var test = problemData.code.replace('__', answer)+'; problem();'
		return eval(test);
	}

	function checkAnswerClick(){
		if(checkAnswer()){
			var correctFlash = learnjs.template('correct-flash');
			correctFlash.find('a').attr('href', `#problem-${problemNumber + 1}`)
			learnjs.flashElement(resultFlash, correctFlash);
		} else {
			learnjs.flashElement(resultFlash, 'Incorrect!')
		}
		return false
	}
	view.find('.check-btn').click(checkAnswerClick);
	view.find('.title').text(`Problem #${problemNumber}`);
	learnjs.applyObject(problemData, view)
	return view
}

learnjs.buildCorrectFlash = function(problemNum){
	var correctFlash = learnjs.template('correct-flash')
	var link = correctFlash.find('a')
	if(problemNum < learnjs.problems.length){
		var buttonItem = learnjs.template('skip-btn')
		link.attr('href','#problem-' + (problemNum + 1));
		$('.nav-list').append(buttonItem);
		view.bind('removingView', function(){
			buttonItem.remove()
		})
	} else {
		link.attr('href', '');
		link.text("You're Finished!");
	}
	return correctFlash;
}

learnjs.showView = function(hash){
	var routes = {
		'#problem': learnjs.problemView,
		'#profile':learnjs.profileView,
		'#': learnjs.landingView,
		'': learnjs.landingView
	}
	var hashParts = hash.split('-')
	var viewFn = routes[hashParts[0]];
	if (viewFn) {
		learnjs.triggerEvent('removingView', []);
		$('.view-container').empty().append(viewFn(hashParts[1]));
	}
}

learnjs.addProfileLink = function(profile){
	var link = learnjs.template('profile-link');
	link.find('a').text(profile.email);
	$('.signin-bar').prepend(link);
}

learnjs.appOnReady = function() {
	window.onhashchange = function() {
		learnjs.showView(window.location.hash);
	}
	learnjs.showView(window.location.hash);
	learnjs.identity.done(learnjs.addProfileLink)
}



