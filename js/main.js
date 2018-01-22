// Alertify library settings
alertify.logPosition("top left");
alertify.parent(document.body);
alertify.maxLogItems(5);
/*

	see the SUBREDDITS section of https://en.wikipedia.org/wiki/Reddit  for a brief definition of what they are
	=======================================================================================================

			File Structure
			==============

	--> **elements** 
		object: contains the DOM elements

	--> **ajaxRequest** 
		customized $.ajax() request function, via a normal JS function, not $.ajaxSetup()

	--> **urlParams** 
		URL parameters data and methods for retrieveing them in an URL friendly format

	--> **requestUrls**
		Object: contains the API Endpoint URL and the CORS Proxy URL, also constructs the URLs for various situations

	--> **subreddits**
		Object: stores the list of subreddits, as well as handling deletion, addition and displaying of subreddits

	--> **images**
		Stores, filters and displays the response data for images into actual HTML

	--> **autocomplete**
		object: handles the autocomplete-related functions and stores the necessary details

	--> **relatedSubreddits**
		object: handles and processes the logic for displaying the list of related subreddits (relative to the current list of subreddits)

	--> **init**
		function: what to run at the page load
*/



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
	autocompleteDisplay: $("#autocomplete"),
	inputs: [],
	srSearchContainer: $("#srSearchContainer"),
	multipleDeleteBtn: $("#multipleDelete"),
	checkAll: $("#checkAll"),
	resetImagesBtn: $("#resetImages")
};

// Customized jQuery ajaxReqest, to avoid using $.ajaxSetup()
function ajaxRequest(reqUrl, condition, timeout, obj){
	console.log(obj.reqName);
	if(condition){
		if(obj.loading){
			elements.loading.removeClass("hidden");
			// elements.inputs.forEach(function(selector){
			// 	$(selector).attr("disabled", true);
			// });
		}
		return $.ajax({
			 url: reqUrl,
			 method: "GET",
			 crossDomain: true,
			 dataType: "json",
			 timeout: timeout,
			 success: function(succData){
			 	console.log("success");
			 	if(obj.success){ obj.success(succData);	}
			 },
			 error: function(errorData){
			 	console.log("error");
			 	if(obj.fail){
			 		obj.fail(errorData);
			 	}
		 		if(errorData.statusText === "timeout"){
		 			alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Request timeout.");
		 		}
			 	if (!obj.silent){
			 		// Timeout message
			 		// General error message (unless the request is aborted by the script via .abort())
			 		if(errorData.statusText !== "abort") {

			 			alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Communication failed.");
			 		}
			 		// else if(errorData.statusText === "errror"){
			 		// 	alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Communication failed.");
			 		// }
			 	}


			 	// if(!obj.silent && errorData.statusText !== "abort"){
			 	// 	alertify.delay(5000).error("<strong>" + obj.reqName + "</strong>: Communication error.");
			 	// }
			 },
			 complete: function(completeData){
			 	console.log("complete");

			 	if(obj.complete){ obj.complete(completeData);	}
			 	if(obj.loading){
			 		elements.loading.addClass("hidden");
			 		// elements.inputs.forEach(function(selector){
			 		// 	$(selector).attr("disabled", false);
			 		// });
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
			value: false
		},
		limit: {
			name: "limit",
			value: 15,
		},
		adultContent: {
			name: "include_over_18",
			value: elements.adultSettingInput[0].checked
		},
		after: {
			name: "after",
			value: "",
		},
		// Time and type start out as whatever their HTML value is		
		sortTime: {
			name: "t",
			value: elements.timeChange.val()
		},
		sortType: elements.typeChange.val(),
		getParams: function(paramList){ // <-- takes an array of params obj names (ex: "sortTime"); --> returns that name:value pairs in an URL-friendly string
			var params = [];
			for(var i = 0; i < paramList.length; i++){
				params.push(this[paramList[i]].name + "=" + this[paramList[i]].value);
			}
			return params.join("&");Add

		},
		setType: function(type) { // makes it that when the type or time is changed, new images are fetched (it affects the results)
			this.sortType = type;
			images.getImages(true);

		},
		setTime: function(time){
			this.sortTime.value = time;
			images.getImages(true);
		},
}


// Returns the API Requests URLs for different tasks
var requestUrls = {
	base: "https://www.reddit.com/",
	corsProxy: "https://cors-anywhere.herokuapp.com/",
	postsData: function(subreddits){
		subreddits = subreddits.join("+").toLowerCase();
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
		url += "r/" + subName + "/about/rules.json";
		return url;
	},
	recommended: function(){
		var url = this.base + "api/recommend/sr/srnames?";
		url += "srnames=" + subreddits.list.join(",") + "&";
		url += urlParams.getParams(["adultContent"]);
		return this.corsProxy + url;
	},
	searchAutocomplete: function(query, adult){
		var url = this.base + "api/subreddit_autocomplete.json?";
		urlParams.longQuery.value = query;
		url += urlParams.getParams(["longQuery", "includeProfiles"]);
		url += "&include_over_18=" + adult;
		return url;
	}
};




// Contains the subreddits data, as well as the related methods for adding/removing them from the list
var subreddits = {
	list: ["itookapicture", "photography", "oldschoolcool", "cinemagraphs", "pbandonedporn", "militaryporn", "earthporn", "spaceporn", "eyebleach"],
	addWithCheck: function(element){
		var value = encodeURI(element.val());
		if(value) {
			element.val("");
			this.checkSubExist(value, function(){
				subreddits.addWithoutCheck(value);
			}, function(){
				// elements.autocompleteDisplay.html("");
				// elements.autocompleteDisplay.addClass("hidden");
			})
		}
	},
	addWithoutCheck: function(value){
		subreddits.list.push(value);
		elements.addInput.val("");
		subreddits.checkDuplicate();
		subreddits.showList(elements.subredditList, true);
		images.getImages(true);
		relatedSubs.getRelatedSubs();
		autocomplete.autocompleteReq.forEach(function(req){
			req.abort();
			autocomplete.secondReqDone = false;
			autocomplete.firstReqDone = false;
		});
		elements.autocompleteDisplay.html("");
		elements.autocompleteDisplay.addClass("hidden");

	},
	checkDuplicate: function(){
		this.list = this.list.filter(function(curr, ind, arr){
			return arr.slice(ind + 1).indexOf(curr) === -1;
		});
	},
	remove: function(nameList){
		var dataIndex;
		for(var i = 0; i < nameList.length; i++){
			var dataIndex = this.list.indexOf(nameList[i]);
			this.list.splice(dataIndex, 1);
		}
		subreddits.showList(elements.subredditList, false);
		images.searchCount = 0;
		images.getImages(true);
		relatedSubs.getRelatedSubs()
	},
	showList: function(element, add){ // constructs the subreddit list based on the subreddits.list (adds/removes if necessary)
		var html = "", 
		inputs = [], 
		i,
		currentIndex;
		var elements = $("#subredditList > .subreddit");
		for(i = 0; i < elements.length; i++){
			inputs.push(elements[i].getAttribute("data-srname"));
		}
		if(add){
			subreddits.list.forEach(function(current){
				if( inputs.indexOf(current.toLowerCase()) === -1){
					html = "";
					html += "<div class='subreddit' data-srname=\"" + current.toLowerCase() + "\">";
					html += "<input type=\"checkbox\" name=\"" + current.toLowerCase() + "\">";
					html += "<div class='subredditName'>" + current.toLowerCase() + "</div>";
					html += "<button class='removeSubreddit' type='button'>X</button>";
					html += "</div>";
					$(html).appendTo(element);
				}
			});
		}
		else {
			inputs.forEach(function(current){
				currentIndex = subreddits.list.indexOf(current);;
				if( currentIndex === -1){
					$("#subredditList").children(".subreddit[data-srname='" + current + "']").remove();
				}
			});
		}
	},
	checkSubExist(subName, succesful, unsuccesful){
		var reqName = "Subreddit Validation";
		var success = function(data){
			if(data.hasOwnProperty("site_rules")){
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
					unsuccesful();
				}
			}
			else if(data.status === 403 && data.hasOwnProperty("responseJSON") && data.responseJSON.reason === "private"){
				alertify.delay(5000).error("<strong>" + reqName + "</strong>:Private  subreddit");
				unsuccesful();
			}
			else {
				alertify.delay(5000).error("<strong>" + reqName + "</strong>: Communication error.");

			}
		};
		ajaxRequest(requestUrls.subExists(subName),true, 4000, {
			success: success,
			fail: error,
			reqName: "Subreddit Validation ",
			silent: true,
			loading: false,
		});
	},
};


var images = {
	displayTitles: elements.titleSettingInput.prop("checked"),
	imageRequests: [], // HTTP Requests for images data
	continueSearch: true, // stops calling the getImages function when there is no more data to get
	imagesTarget: 15, // roughly how many images to display for the fresh image requests
	maxNewSearchRequests: 5, // stops trying to get the imagesTarget no. of images when the requests for that exeed this amount
	searchCount: 0, // keeps track of the no. of requests for fresh image requests
	maximumResWidth: 320, // the image resolution target for previews, can go lower than this, but not higher
	rawResponseData: [], // unfiltered (for adult and images) response data
	filterAdult: function(){
		if(!urlParams.adultContent.value){
			this.rawResponseData = this.rawResponseData.filter(function(current){
				return !current.over_18;
			});
		}
	},
	keepOnlyImages: function(){
		this.rawResponseData = this.rawResponseData.filter(function(current){
			// if(current.domain.search("imgur") >= 0){
			// 	current.url += ".jpg";
			// }
			return current.url.search(/(.jpg|.png|.jpeg|.bmp|.svg)$/gi) >= 0;
		});
	},
	getCorrectResolution: function(post){
		if(post.hasOwnProperty("preview")){
			for(var i = post.preview.images[0].resolutions.length - 1; i >= 0; i--){
				if(post.preview.images[0].resolutions[i].width <= 320){
					return post.preview.images[0].resolutions[i].url;
				}
			}
		}
		else {
			return post.url;
		}
	},
	displayImages: function(){
		var htmlS = "";
		this.rawResponseData.forEach(function(current, indx, arr){
			//  
			htmlS += "<div class='imageResult'>";
			htmlS += "<img onerror=\"deleteEl(this);\" onload=\"showOnload(this);\" class=\"faded\" src=\"" + images.getCorrectResolution(current);
			htmlS += "\" data-fullurl=\"" + current.url + "\"" + "\">";
			htmlS += "<div class='postText'>" + current.title + "</div>";
			htmlS += "<div class='subredditSource'>" + current.subreddit_name_prefixed + "</div>";
			htmlS += "<div class='subredditSource'>" + requestUrls.base + current.permalink + "</div></div>";
		});
		var imagesElements = $(htmlS);
		this.rawResponseData = [];
		imagesElements.appendTo(elements.imagesContainer);
	},
	getImages(newSearch){ 
		if(newSearch){
			if(!this.searchCount){
				urlParams.after.value = "";
				images.rawResponseData = [];
				elements.imagesContainer.html("");
				this.imageRequests.forEach(function(req){
					req.abort();
				});
				this.imageRequests = [];
				this.continueSearch = true;
			}
			elements.loadMore.addClass("hidden");
			this.searchCount++;
		}
		else {
			this.searchCount = 0;
		}
		var url = requestUrls.postsData(subreddits.list);
		var resData;
		if(subreddits.list.length){
			var req = ajaxRequest(url, images.continueSearch, 7000, {
				reqName: "Getting Images",
				silent: false,
				loading: true,
				success: function(succ){
							succ.data.children.forEach(function(cr){
								images.rawResponseData.push(cr.data);
							});
							images.keepOnlyImages();
							images.filterAdult()
							urlParams.after.value = succ.data.after;
							var displayImg = new Promise(function(res, rej){
								images.displayImages();
								setTimeout(function(){
									res();
								}, 250);
							}).then(function(){
								var imagesCount = $("#imagesContainer .imageResult").length;
								if(!succ.data.after) {
									images.searchCount = 5;
									images.continueSearch = false;
									elements.loadMore.addClass("hidden");

								}
								else {
									elements.loadMore.removeClass("hidden");								
								}
								if((images.searchCount === images.maxNewSearchRequests) && imagesCount  === 0){
									alertify.delay(5000).error("No images to load." );
								}
								else if(!succ.data.after){
									alertify.delay(5000).error("No more images to load.");
								}
								if(newSearch && (imagesCount < images.imagesTarget) && (images.searchCount < images.maxNewSearchRequests)){
									images.getImages(true);
								}
								else {
									images.searchCount = 0;
								}
							});
							
							
						},
				complete: function() {
					elements.loadMore.removeClass("hidden");
				},

			});
			this.imageRequests.push(req);
		}
	}
};


var autocomplete = {
	firstReqDone: false,
	secondReqDone: false,
	combinedSuggestions: [],
	recommendedListSFW: [],
	recommendedListNSFW: [],
	autocompleteReq: [], // HTTP Requests for autocomplete data
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
			elements.autocompleteDisplay.removeClass("hidden");
			var html = "";
			this.combinedSuggestions.forEach(function(sr){
				html += "<li data-srname='" + sr + "'>/r/" + sr + "</li>"; 
			});
			elements.autocompleteDisplay.html(html);
		}
		else {
			// elements.autocompleteDisplay.html("");
			// elements.autocompleteDisplay.add("hidden");
		}
		this.recommendedListNSFW = [];
		this.recommendedListSFW = [];
	},
	addSuggestions: function(){
		if(this.firstReqDone && this.secondReqDone){
			this.firstReqDone = false;
			this.secondReqDone = false;
			this.combineSuggestions();
		}
	},
	getAutocomplete: function(value){
		this.autocompleteReq.forEach(function(req){
			req.abort();
			autocomplete.secondReqDone = false;
			autocomplete.firstReqDone = false;
		});
		if(elements.addInput.val()){
			console.log(this);
			this.autocompleteReq.push( ajaxRequest(requestUrls.searchAutocomplete(value, true), true, 1500, {
				complete: function(data){
					if(data.responseJSON){
						data.responseJSON.subreddits.forEach(function(sr){
							if(sr.allowedPostTypes.images && sr.name.substring(0,2) !== "u_" && sr.numSubscribers >= 1){
								autocomplete.recommendedListNSFW.push(sr.name);
							}
						});
						autocomplete.firstReqDone = true;
						autocomplete.addSuggestions();
					}
				},
				silent: true
			}) );
			this.autocompleteReq.push( ajaxRequest(requestUrls.searchAutocomplete(value, false), true, 1500, {
				complete: function(data){
					if(data.responseJSON){
						data.responseJSON.subreddits.forEach(function(sr){
							if(sr.allowedPostTypes.images && sr.name.substring(0,2) !== "u_" && sr.numSubscribers >= 1){
								autocomplete.recommendedListSFW.push(sr.name);
							}
						});
					}
					autocomplete.secondReqDone = true;
					autocomplete.addSuggestions();
				},
				silent: true
			}) );
		}
		else {
			this.autocompleteReq.forEach(function(req){
				req.abort();
				autocomplete.secondReqDone = false;
				autocomplete.firstReqDone = false;
			});
			elements.autocompleteDisplay.html("");
			elements.autocompleteDisplay.addClass("hidden");
		}
	}
};

var relatedSubs = {
	relatedSubsReq: "",
	getRelatedSubs: function(){
		if(this.relatedSubsReq){
			this.relatedSubsReq.abort();
		}
		var html = "";
		if(subreddits.list.length){
			this.relatedSubsReq = ajaxRequest(requestUrls.recommended(), true, 5000, {
				success: function(res){
				res.forEach(function(srname){
					html += "<li data-srname=" + srname.sr_name + ">/r/" + srname.sr_name + "</li>"; 
				});
				elements.recommendedList.html(html);
			},
			silent: true,
			loading: false,
			});
		}
		else {
			elements.recommendedList.html(html);
		}
	},
};




// don't show images with broken "src" link
function deleteEl(el) {
	$(el).parent().remove();
};
// Shows an image only when it's fully loaded
function showOnload(el){
	$(el).addClass("visible");
}




function init(){
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
		subreddits.remove([$(this).prev().text()]);
	});






	elements.adultSettingInput.on("change", function(){
		urlParams[$(this).attr("name")].value = this.checked;
		images.searchCount = 0;
		images.getImages(true);
		autocomplete.getAutocomplete(elements.addInput.val());
	});

	elements.titleSettingInput.on("change", function(){
		images[$(this).attr("name")] = this.checked;
		if(images[$(this).attr("name")]){
			elements.imagesContainer.removeClass("no-titles");	
		}
		else {
			elements.imagesContainer.addClass("no-titles");	
		}
		
	});

	$("#imagesContainer").on("error", ".imageResult img", function(){
	});

	elements.loadMore.on("click", function(){
		images.getImages(false);
	});

	elements.recommendedList.on("click", "li", function(){
		subreddits.addWithoutCheck($(this).attr("data-srname"));
		$(this).remove();
	});
	elements.autocompleteDisplay.on("click", "li", function(){
		subreddits.addWithoutCheck($(this).attr("data-srname"));
	});


	elements.addInput.on("input", function(){
		if(!$(this).val()){
			// elements.autocompleteRes.html("");
			// elements.autocompleteRes.addClass("hidden");
		}
		autocomplete.getAutocomplete($(this).val());
	});
	elements.addInput.on("change", function(){
		if(!$(this).val()){
			// elements.autocompleteRes.html("");
			// elements.autocompleteRes.addClass("hidden");
		}
		// requests.autocomplete($(this).val());	
	});
	elements.srSearchContainer.on("blur", function(){
		elements.autocompleteReq.forEach(function(req){
			req.abort();
		})
		elements.autocompleteDisplay.html("");
		elements.autocompleteDisplay.addClass("hidden");
	});



	elements.addBtn.on("click", function(){
		subreddits.addWithCheck(elements.addInput);
	});

	elements.multipleDeleteBtn.on("click", function(){
		var deleteList = [],
		currentEl;
		elements.checkAll.prop("checked", false);
		var els = elements.subredditList.children(".subreddit");
		for(var i = 0; i < els.length; i++){
			var currentEl = $(els[i]);
			if(currentEl.children("input")[0].checked){
				deleteList.push(currentEl.children("input").attr("name"));
			}
		}
		subreddits.remove(deleteList);
	});

	elements.checkAll.on("change", function(){
		if(this.checked){
			$(".subreddit input").prop("checked", true);
		}
		else {
			$(".subreddit input").prop("checked", false);
		}
	});

	elements.resetImagesBtn.on("click", function(){
		images.getImages(true);
	});
	subreddits.showList(elements.subredditList, true);
	images.getImages(true);
	relatedSubs.getRelatedSubs();
}
init();