// Alertify settings
alertify.logPosition("top left");
alertify.parent(document.body);
alertify.maxLogItems(5);

// DOM elements
var elements = {
	subredditList: $("#subredditList"),
	addInput: $("#addSubreddit"),
	addBtn: $("#addSubredditBtn"),
	adultSettingInput:$(".settings #nsfw"),
	titleSettingInput: $(".settings #titles"),
	typeChange: $("#type"),
	timeChange: $("#time"),
	statusMessage: $("#statusMessage"),
	imagesContainer: $("#imagesContainer"),
	loading: $("#loading"),
	recommendedList: $("#recommended"),
	loadMore: $("#loadMore"),
	// autocompleteRes: $("#autocomplete"),
	inputs: ["#addSubredditBtn", ".settings input", "#type", "#type", ".removeSubreddit"],
};

// Customized jQuery AJAX request function
function ajaxRequest(reqUrl, condition, timeout, obj){
	if(condition){
		if(!obj.silent){
			elements.loading.removeClass("hidden");
			elements.inputs.forEach(function(selector){
				$(selector).attr("disabled", true);
			});
		}
		return $.ajax({
			 beforeSend: function(){
			 },
			 url: reqUrl,
			 method: "GET",
			 crossDomain: true,
			 dataType: "json",
			 timeout: timeout,
			 success: function(succData){

			 	if(obj.success){ obj.success(succData);	}
			 },
			 error: function(errorData){
			 	if(obj.fail){
			 		obj.fail(errorData);
			 	}
			 	else {
			 		if(!obj.silent && errorData.statusText !== "abort"){
			 			alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Communication error.");
			 		}
			 	}
			 	if (errorData.statusText === "timeout"){
		 			if(!obj.silent){
						alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Request timeout.");
					}
			 	}
			 },
			 complete: function(completeData){
			 	console.log("completed");
			 	if(obj.complete){ obj.complete(completeData);	}
			 	if(!obj.silent){
			 		elements.loading.addClass("hidden");
			 		elements.inputs.forEach(function(selector){
			 			$(selector).attr("disabled", false);
			 		});
			 	}
			 }
		});
	}
}

// API URL paramteres data & methods for retrieving / changing them
var urlParams = {
		searchQuery: {
			name: "q",
			value: "cats"
		},
		longQuery: {
			name: "query",
			value: ""
		},
		includeProfiles: {
			name:"include_profiles",
			value: elements.titleSettingInput[0].checked
		},
		limit: {
			name: "limit",
			value: 100,
		},
		existanceLimit: {
			name: "limit",
			value: 1
		},
		searchLimit: {
			name: "limit",
			value: 5,
		},
		adultContent: {
			name: "include_over_18",
			value: elements.adultSettingInput[0].checked
		},
		after: {
			name: "after",
			value: "",
		},		
			// ["top", "controversial", "rising", "new", "hot"],
		sortTime: {
			name: "t",
			value: elements.timeChange.val()
		},
		sortType: elements.typeChange.val(),
			// ["hour", "day", "week", "month", "year", "all"]
		getParams: function(paramList){
			var params = [];
			for(var i = 0; i < paramList.length; i++){
				params.push(this[paramList[i]].name + "=" + this[paramList[i]].value);
			}
			return params.join("&");
		},
		setType: function(type) {
			this.sortType = type;
			helperFunctions.getImages(true);

		},
		setTime: function(time){
			this.sortTime.value = time;
			helperFunctions.getImages(true);
		},
}

// Returns the API Requests URLs for different tasks
var requestUrls = {
	base: "https://www.reddit.com/",
	corsProxy: "https://cors-anywhere.herokuapp.com/",
	postsData: function(subreddits){
		subreddits = subreddits.join("+");
		var url = this.base + "r/" + subreddits;
		url += "/" + urlParams.sortType + ".json?";
		return url + urlParams.getParams(["limit", "after", "sortTime"]);
	},
	// search: function(query) {
	// 	var url = this.base + "search.json?";
	// 	urlParams.searchQuery.value = query;
	// 	return url + urlParams.getParams(["searchLimit", "adultContent", "searchQuery"]);
	// },
	subExists: function(subName) {
		var url = this.corsProxy + this.base
		url += "r/" + subName.toLowerCase() + "/about/rules.json";
		return url;
	},
	recommended: function(){
		var url = this.base + "api/recommend/sr/srnames?";
		url += "srnames=" + subreddits.list.join(",") + "&";
		url += urlParams.getParams(["adultContent"]);
		return this.corsProxy + url;
	},
	// searchAutocomplete: function(query, adult){
	// 	var url = this.base + "api/subreddit_autocomplete.json?";
	// 	urlParams.longQuery.value = query;
	// 	url += urlParams.getParams(["longQuery", "includeProfiles"]);
	// 	url += "&include_over_18=" + adult;
	// 	return url;
	// }
};




// Contains the subreddits data, as well as the related methods for adding/removing them from the list
var subreddits = {
	list: ["itookapicture", "photography", "oldschoolcool", "cinemagraphs", "pbandonedporn", "militaryporn", "earthporn", "spaceporn", "eyebleach", "aww"],
	addWithCheck: function(element){
		var value = encodeURI(element.val());
		if(value) {
			element.val("");
			helperFunctions.checkSubExist(value, function(){
				subreddits.addWithoutCheck(value);
			}, function(){
				// elements.autocompleteRes.html("");
				// elements.autocompleteRes.addClass("hidden");
			})
		}
	},
	addWithoutCheck: function(value){
		subreddits.list.push(value);
		elements.addInput.val("");
		subreddits.checkDuplicate();
		helperFunctions.showList(elements.subredditList);
		helperFunctions.getImages(true);
		// elements.autocompleteRes.html("");
		// elements.autocompleteRes.addClass("hidden");
		helperFunctions.getRelatedSubs();

	},
	checkDuplicate: function(){
		this.list = this.list.filter(function(curr, ind, arr){
			return arr.slice(ind + 1).indexOf(curr) === -1;
		});
	},
	remove: function(name){
		var dataIndex = this.list.indexOf(name);
		this.list.splice(dataIndex, 1);
		helperFunctions.showList(elements.subredditList);
		helperFunctions.getImages(true);
		helperFunctions.getRelatedSubs()
	}
};

var settings = {
	titles: false,
	adultContent: false,
};


var helperFunctions = {
	showList: function(element){
		var html = "";
		subreddits.list.forEach(function(current){
			html += "<div class='subreddit'>"
			html += "<div class='subredditName'>" + current + "</div>";
			html += "<button class='removeSubreddit' type='button'>X</button>";
			html += "</div>";
		});
		element.html(html);
	},
	getImages(newSearch){
		if(newSearch){
			if(!generalData.searchCount){
				urlParams.after.value = "";
				elements.imagesContainer.html("");
				generalData.imageRequests.forEach(function(req){
					req.abort();
				})
				generalData.imageRequests = [];
			}
			generalData.continueSearch = true;
			elements.loadMore.addClass("hidden");
			generalData.searchCount++;
		}
		else {
			generalData.searchCount = 0;
		}
		var url = requestUrls.postsData(subreddits.list);
		var resData;
		if(subreddits.list.length){
			generalData.imageRequests.push( ajaxRequest(url, generalData.continueSearch, 3500, {
				success: function(succ){
							resData = succ;
							
							resData.data.children.forEach(function(cr){
								generalData.arr.push(cr.data);
							});
							generalData.keepOnlyImages();
							generalData.filterAdult()
							// console.log(generalData.arr);
							urlParams.after.value = resData.data.after;
							generalData.displayImages();
							if(!resData.data.after && generalData.searchCount) {
								alertify.delay(5000).error("No more images to load.");
							}
							elements.loadMore.removeClass("hidden");
							if(newSearch && $("#imagesContainer .imageResult").length < 25 && generalData.searchCount < 5){
								helperFunctions.getImages(true);
							}
							else {
								generalData.searchCount = 0;
							}
							if(generalData.searchCount === 5){
								alertify.delay(5000).error("No images to load.");
							}
						},
				reqName: "Getting Images"
			}) );
			// console.log(generalData.imageRequests);
		}
		else {
			generalData.displayImages();
		}


	},
	getRelatedSubs: function(){
		var html = "";
		if(subreddits.list.length){
			ajaxRequest(requestUrls.recommended(), true, 5000, {
				success: function(res){
				res.forEach(function(srname){
					html += "<li>/r/" + srname.sr_name + "</li>"; 
				});
				elements.recommendedList.html(html);
			},
			silent: true
			});
		}
		else {
			elements.recommendedList.html(html);
		}
	},
	checkSubExist(subName, succesful, unsuccesful){
		var reqName = "Subreddit Validation";
		generalData.subExists = false;
		subName = subName.toLowerCase();
		var success = function(data){
			if(data.hasOwnProperty("site_rules")){
				generalData.subExists = true;
				succesful();
			}
			else {
				alertify.delay(5000).error("<strong>" + reqName + "</strong>:Subreddit doesn't exist.");
					unsuccesful();
			}
		};
		var error = function(data){
			if(data.status === 404){
				if(data.hasOwnProperty("responseJSON")){
					if(data.responseJSON.hasOwnProperty("reason")){
						alertify.delay(5000).error("<strong>" + reqName + "</strong>:Private or banned subreddit");
						unsuccesful();
					}
					else {
						alertify.delay(5000).error("<strong>" + reqName + "</strong>:Subreddit doesn't exist");
						unsuccesful();
					}
				}
				else {
					// alertify.delay(5000).error("Communication error.");
					unsuccesful();
				}
			}
		};
		ajaxRequest(requestUrls.subExists(subName),true, 3000, {
			success: success,
			fail: error,
			reqName: "Subreddit Validation "
		});
	},
	// autocomplete: function(value){
	// 	ajaxRequest(requestUrls.searchAutocomplete(value, true), true, 1500,"","", function(data){
	// 		if(data.responseJSON && !generalData.stopAutocompletes){
	// 			data.responseJSON.subreddits.forEach(function(sr){
	// 				if(sr.allowedPostTypes.images && sr.name.substring(0,2) !== "u_" && sr.numSubscribers >= 1){
	// 					generalData.recommendedListNSFW.push(sr.name);
	// 				}
	// 			});
	// 		}
	// 		generalData.firstReqDone = true;
	// 		generalData.addSuggestions();
	// 	});
	// 	ajaxRequest(requestUrls.searchAutocomplete(value, false),true, 1500, "", "",function(data){
	// 			if(data.responseJSON && !generalData.stopAutocompletes){
	// 				data.responseJSON.subreddits.forEach(function(sr){
	// 					if(sr.allowedPostTypes.images && sr.name.substring(0,2) !== "u_" && sr.numSubscribers >= 1){
	// 						generalData.recommendedListSFW.push(sr.name);
	// 					}
	// 				});
	// 			}
	// 			generalData.secondReqDone = true;
	// 			generalData.addSuggestions();
	// 	});
	// }
	
};


var generalData = {
	imageRequests: [],
	firstReqDone: false,
	secondReqDone: false,
	imgReqTries: 0,
	maxReqTries: 5,
	addSuggestions: function(){
		if(this.firstReqDone && this.secondReqDone){
			this.firstReqDone = false;
			this.secondReqDone = false;
			this.combineSuggestions();
		}
	},
	recommendedListSFW: [],
	recommendedListNSFW: [],
	finalList: [],
	subExists: false,
	searchCount: 0,
	continueSearch: true,
	arr: [],
	keepOnlyImages: function(){
		this.arr = this.arr.filter(function(current){
			// if(current.domain.search("imgur") >= 0){
			// 	current.url += ".jpg";
			// }
			return current.url.search(/(.jpg|.png|.jpeg|.bmp|.svg)$/gi) >= 0;
		});
	},
	filterAdult: function(){
		if(!urlParams.adultContent.value){
			this.arr = this.arr.filter(function(current){
				return !current.over_18;
			});
		}
	},
	displayImages: function(){
		var htmlS = "";
		this.arr.forEach(function(current, indx, arr){
			htmlS += "<div class='imageResult'>";
			htmlS += "<img onload=\"showOnload(this);\" class=\"faded\" src=\"" + generalData.getCorrectResolution(current);
			htmlS += "\" data-fullurl=\"" + current.url + "\"" + "\">";
			htmlS += "<div class='postText'>" + current.title + "</div>";
			htmlS += "<div class='subredditSource'>" + current.subreddit_name_prefixed + "</div>";
			htmlS += "<div class='subredditSource'>" + requestUrls.base + current.permalink + "</div></div>";
		});
		var images = $(htmlS);
		this.arr = [];
		images.appendTo(elements.imagesContainer);
	},
	getCorrectResolution: function(post){
		for(var i = post.preview.images[0].resolutions.length - 1; i >= 0; i--){
			// console.log(post.preview.images[0].resolutions[i]);
			if(post.preview.images[0].resolutions[i].width <= 320){
				return post.preview.images[0].resolutions[i].url;
			}
		}
	},
	maximumResWidth: 320,
	combinedSuggestions: [],
	combineSuggestions: function(){
		this.combinedSuggestions = [];
		if(!urlParams.adultContent.value){
			this.recommendedListNSFW = [];
		}
		var i = 0;
		while(this.combinedSuggestions.length <= 5){
			if(i % 3 === 0 && this.recommendedListNSFW.length){
				this.combinedSuggestions.push(this.recommendedListNSFW.shift());
			}
			else if(this.recommendedListSFW.length) {
				this.combinedSuggestions.push(this.recommendedListSFW.shift())		
			}
			if(!this.recommendedListSFW.length && !this.recommendedListNSFW.length){
				break;
			}
			i++;
		}
		if(this.combinedSuggestions.length){
			// elements.autocompleteRes.removeClass("hidden");
			var html = "";
			this.combinedSuggestions.forEach(function(sr){
				html += "<li data-srname='" + sr.toLowerCase() + "'>/r/" + sr + "</li>"; 
			});
			// elements.autocompleteRes.html(html);
		}
		else {
			// elements.autocompleteRes.html("");
			// elements.autocompleteRes.add("hidden");
		}
		this.recommendedListNSFW = [];
		this.recommendedListSFW = [];
	},
};
function deleteEl(el) {
	$(el).parent().remove();
};
function showOnload(el){
	$(el).addClass("visible");
	// $(el).fadeOut(0);
	// $(el).css("display", "inline-block");
	// $(el).fadeIn(500);
}
elements.typeChange.on("input", function(){
	var value = $(this).val();
	if(value === "controversial" || value === "top"){
		$(this).next().removeClass("hidden");	
	}
	else {
		$(this).next().addClass("hidden");	
	}
	urlParams.setType(value);
});

elements.timeChange.on("change", function(){
	urlParams.setTime($(this).val());
});

elements.subredditList.on("click", ".removeSubreddit", function(){
	subreddits.remove($(this).prev().text());
});




helperFunctions.showList(elements.subredditList);


elements.adultSettingInput.on("change", function(){
	urlParams[$(this).attr("name")].value = this.checked;
	helperFunctions.getImages(true);
	// helperFunctions.autocomplete(elements.addInput.val());
});

elements.titleSettingInput.on("change", function(){
	settings[$(this).attr("name")] = this.checked;
	if(settings[$(this).attr("name")]){
		elements.imagesContainer.addClass("no-titles");	
	}
	else {
		elements.imagesContainer.removeClass("no-titles");	
	}
	
});

$("#imagesContainer").on("error", ".imageResult img", function(){
});

elements.loadMore.on("click", function(){
	helperFunctions.getImages(false);
});

elements.recommendedList.on("click", "li", function(){
	subreddits.addWithoutCheck($(this).text().substring(3));
});
// elements.autocompleteRes.on("click", "li", function(){
// 	subreddits.addWithoutCheck($(this).text().substring(3));
// });


// elements.addInput.on("input", function(){
// 	if(!$(this).val()){
// 		generalData.stopAutocompletes = true;
// 		elements.autocompleteRes.html("");
// 		elements.autocompleteRes.addClass("hidden");
// 	}
// 	else {
// 		generalData.stopAutocompletes = false;	
// 	}
// 	helperFunctions.autocomplete($(this).val());
// });
// elements.addInput.on("change", function(){
// 	if(!$(this).val()){
// 		generalData.stopAutocompletes = true;
// 		elements.autocompleteRes.html("");
// 		elements.autocompleteRes.addClass("hidden");

// 	}
// 	else {
// 		generalData.stopAutocompletes = false;	
// 	}
// 	helperFunctions.autocomplete($(this).val());	
// });
// elements.addInput.on("blur", function(){
// 	elements.autocompleteRes.html("");
// 	elements.autocompleteRes.addClass("hidden");
// });



elements.addBtn.on("click", function(){
	subreddits.addWithCheck(elements.addInput);
});