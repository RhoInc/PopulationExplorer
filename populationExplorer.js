////////////////////////////////////////////////////////////////
//
// Population Explorer Library
//
//////////////////////////////////////////////////////////////////

var popExplore = {
	//Load the data from <<path>> and call needed routines to create the interactive graphic
	init: function(element, raw, settings, onDataError){ //REQUIRED
		var canvas = d3.select(element);
		settings.canvas = canvas;
		
		/**error checking**/
		function errorNote(msg){
			canvas.append("div").attr("class", "alert alert-error alert-danger").text(msg);
		};

		var columns = d3.keys(raw[0]);
		settings.denominator.forEach(function(e){
			if(e.type === "checklist"){
				e.names.forEach(function(n){
					if(columns.indexOf(n) === -1){
						errorNote("Error in settings object.");
						throw new Error("In denominator checklist: "+"\""+n+"\" not found in dataset.");
					}
				})
			}
			else if(columns.indexOf(e.name) === -1){
				errorNote("Error in settings object.");
				throw new Error("In denominator: "+"\""+e.name+"\" not found in dataset.");
			}
		});
		settings.numerator.forEach(function(e){
			if(e.type === "checklist"){
				e.names.forEach(function(n){
					if(columns.indexOf(n) === -1){
						errorNote("Error in settings object.");
						throw new Error("In denominator checklist: "+"\""+n+"\" not found in dataset.");
					}
				})
			}
			else if(columns.indexOf(e.name) === -1){
				errorNote("Error in settings object.");
				throw new Error("In numerator: "+"\""+e.name+"\" not found in dataset.");
			}
		});
		
		settings.selectors = d3.keys(raw[0]).map(function(m){return {name: m} });
		settings.denominator.forEach(function(e){e.chosen = true});
		settings.numerator.forEach(function(e){e.chosen = true});
		popExplore.layout(canvas,raw,settings);
		var data = popExplore.dataprep(raw,settings);
		d3.select(window).on("resize")();
	},

	remove: function(settings){
		settings.canvas.selectAll("*").remove();
	},

	//Add needed structure to <<canvas>>
	layout: function(canvas, raw, settings){

		var wrapper=canvas.append("div").attr("class","ig-popCalc") //REQUIRED

		var header = wrapper.append("div").attr("class","head")
		//header.append("h1").html("Participant Characteristic Explorer")
		header.append("p").append("small").html("Use the buttons and sliders to find rates by defining subgroups and characteristics of interest. Drag sliders to subset. Click buttons to toggle. Alt-click to select a single option.")
			
//		var summary = wrapper.append("div").attr("class","summary alert alert-info")
//		.html("Overview: <strong><span class='percent'></span> selected.</strong> <span class='total'></span> "+settings.head+" &rarr; <span class='denominator'></span> subpopulation of interest &rarr; <span class='numerator'></span> participants selected")

		var summary = wrapper.append("div").attr("class","summary");
		summary.append("h2").html("Summary");
		settings.rowUnits = settings.rowUnits ? settings.rowUnits : "rows"
		var summary_nums = summary.append("div").attr("class", "summary-nums");
		summary_nums.append("h1").html("<span class='percent'></span> selected").attr("class","text-chosen")
		summary_nums.append("div").attr("class", "sum-num").html("<span class='total'></span> "+settings.rowUnits+" total");
		summary_nums.append("div").attr("class", "sum-num").html("<span class='denominator'></span> "+settings.rowUnits+" subpopulation");
		summary_nums.append("div").attr("class", "sum-num").html("<span class='numerator'></span> "+settings.rowUnits+" selected");

		if(settings.viz){
			settings.margin = {top: 0, bottom: 5, right: 5, left: 5};
			settings.width = 160 - settings.margin.left - settings.margin.right; 
			settings.height = settings.width - settings.margin.top - settings.margin.bottom; 
			var data = d3.range(0,100);
			var x = d3.scale.ordinal()
				.domain(d3.range(0,10))
    			.rangeBands([0, settings.width], .0);
			var y = d3.scale.ordinal()
				.domain(d3.range(0,10))
    			.rangeBands([0, settings.height], .0);

			settings.svg = summary.append("svg")
				.attr("class", "ig-svg")
				.attr("width", settings.width + settings.margin.left + settings.margin.right)
				.attr("height", settings.height + settings.margin.top + settings.margin.bottom)

				.append("g")
					.attr("transform", "translate(" + settings.margin.left + "," + settings.margin.top + ")")

			var blocks = settings.svg.selectAll(".block")
				.data(data)
				.enter().append("rect")
				.attr("class", "block")
				.attr("width", settings.width/10)
				.attr("height", settings.height/10)
				.attr("x", function(d){return x(Math.floor(d/10))})
				.attr("y", function(d){return y(Math.floor(d%10))})
				.attr({
					"fill": "#ccc",
					"stroke": "white",
					"stroke-width": 2
				});
		}//viz

		summary.append("button").attr("class", "btn btn-warning btn-xs btn-mini btn-reset").text("Reset Selections").on("click", function(){
			var data = popExplore.dataprep(raw,settings);
			summary.selectAll(".presel-btn").classed("btn-primary", false)
			popExplore.draw(canvas, data,settings);
		});

		if(settings.preselects){
			var presel_div = summary.append("div").attr("class", "preselections");
			presel_div.append("h4").text("Predetermined Criteria");
			var presel_btns = presel_div.selectAll(".presel-btn")
				.data(settings.preselects)
				.enter().append("button")
				.attr("class", "btn btn-sm btn-small presel-btn btn-default")
				.text(function(d){return d.title});
		}//preselect btns

		var controls = wrapper.append("div").attr("class", "controls");
		var denom = controls.append("div").attr("class","denominator");
		var denom_head = denom.append("div").attr("class", "control-head");
		denom_head.append("h2").text("Subpopulation");
		denom_head.append("p").html("<span class='denominator'></span> in target population");
		denom_head.append("button").attr("class", "btn btn-xs btn-mini section-toggle").text("- collapse")
			.on("click", function(){
				var toggle = $(this).text() === "- collapse";
				if(toggle){
					$("div.denominator .selector").slideUp();
					$(this).text("+ expand");
				}
				else{
					$("div.denominator .selector").slideDown();
					$(this).text("- collapse");
				}
			});

		var numer = controls.append("div").attr("class","numerator");

		var numer_head = numer.append("div").attr("class", "control-head");
		numer_head.append("h2").text("Participant Characteristics");
		numer_head.append("p").html("<span class='percent'></span> meet selected criteria (<span class='numerator'></span> of <span class='denominator'></span>)");
		numer_head.append("button").attr("class", "btn btn-xs btn-mini section-toggle").text("- collapse")
			.on("click", function(){
				var toggle = $(this).text() === "- collapse";
				if(toggle){
					$("div.numerator .selector").slideUp();
					$(this).text("+ expand");
				}
				else{
					$("div.numerator .selector").slideDown();
					$(this).text("- collapse");
				}
			});
			
		if(settings.participantTable){
			var participantTable = wrapper.append("div").attr("class","participantTable");
			var ptable_head = participantTable.append("div").attr("class", "control-head");
			ptable_head.append("h2").text("Selected Participants");
			ptable_head.append("p").text("Table of participants meeting selected characteristics");
			ptable_head.append("a").attr("class", "btn btn-xs btn-mini btn-primary btn-download").text("Printer-friendly view").on("click", function(){
				var print_table_settings = {cols: settings.participantTable.cols, headers: settings.participantTable.headers, start: 1};

				var sub = data.filter(function(e){return e.numerator==1 && e.denominator==1});
				var print_canvas = d3.select("body").append("div").attr("id", "print-table");
				
				//Draw the table
				basicTable.layout(print_canvas,sub,print_table_settings);
				var sub=basicTable.transform(sub,print_table_settings);
				basicTable.draw(print_canvas,sub,print_table_settings) ;
				var print_window = window.open();
				var XMLS = new XMLSerializer(); 

				var css = 'table { border-collapse: collapse; font: 12px sans-serif;} .table thead th {vertical-align: bottom; border: none;} .table th {font-weight: bold; } .table th, .table td {padding: 8px; line-height: 20px; text-align: left; vertical-align: top; border-top: 1px solid #dddddd;}';
			    head = print_window.document.head;
			    style = print_window.document.createElement('style');
			    style.appendChild(print_window.document.createTextNode(css));
			    head.appendChild(style)
				print_window.document.title = "Print Table";
				var instruction = "<p>Press Ctrl+P to print this page. To quickly get this table into an Excel spreadsheet, first create a new Excel document and name"+
					" it as you see fit. Then, select the entire table below (you can press Ctrl+A to select all), copy it (Ctrl+C), and paste it into the Excel document (Ctrl+V). Save"+
					" the document and use it how you like!</p>";
				print_window.document.body.innerHTML = instruction+XMLS.serializeToString(print_canvas.node());

				print_canvas.remove();
				return false;
			});
		};

		//format changes when window gets too small
		var child_widths = d3.max(summary.selectAll(".presel-btn")[0].map(function(m){return parseInt(d3.select(m).style("width"))}));
		var goal = child_widths > 170 ? child_widths : 170;
		var reFormat = function(){
			var sum_width = parseInt(summary.style("width"));
			var div_width = parseInt(wrapper.style("width"));
			if(sum_width <= goal || div_width <= 850){
				summary.style({
					"float": "none",
					"width": "auto",
					"padding-right": "0"
				});
				summary_nums.style("display", "inline-block");
				summary.select("svg").style({
					"position": "absolute",
					"right": "0",
					"top": "55px"
				});
				summary.selectAll(".presel-btn").style({"display": "inline-block", "margin-right": "10px"});
				controls.style({
					"width": "auto",
					"float": "none",
					"padding": "0",
					"border": "none"
				})
			}
			else{
				summary.style({
					"float": null,
					"width": "20%",
					"padding-right": null
				});
				summary_nums.style("display", null);
				summary.select("svg").style({
					"position": null,
					"right": null,
					"top": null
				});
				summary.selectAll(".presel-btn").style({"display": "block", "margin-right": null});
				controls.style({
					"width": "80%",
					"float": null,
					"padding": null,
					"border": null
				})
			}
		};
		d3.select(window).on("resize", reFormat);

		var data = popExplore.dataprep(raw,settings); 
		popExplore.draw(canvas, data,settings);
	},

	//Prepare <<data>> for popExplore.draw()
	dataprep: function(data, settings){
		data.forEach(function(e){
			e.denominator = 1;
			e.numerator = 1;
		})
		return data;
	},

	//Create the table for the given <<data>> according to <<settings>>
	draw: function(canvas, data, settings){
		canvas.selectAll(".selector").remove();

		var checkClick = function(d){
			var setting = d3.select(this.parentNode.parentNode.parentNode).datum();
			if (d3.event && d3.event.altKey) { //select *only* this option  if alt is pushed
				//Update the settings object
				setting.levels.forEach(function(level){
					level.n=0;
					level.selected=0;
				})
				d.n=d3.sum(data,function(e){return e[setting.name]==d.label})
				d.selected = 1;

				//Update button formatting
				var parentList = d3.select(this).node().parentNode.parentNode //Need 2 parents since we wrap <button> in <li>
				d3.select(parentList).selectAll("li").classed("active",false);
				d3.select(parentList).selectAll("li").select("label").classed("selected", false);
				d3.select(parentList).selectAll("li").select("input").property("checked", false)//.classed("btn-success",false)
				d3.select(parentList).selectAll("li").select("span.n").html(function(d){return d.n})
				d3.select(this.parentNode).classed("active", true)
				d3.select(this).classed("selected",true).select("input").property("checked", true)//.classed("btn-success",true)
			} else {  //otherwise toggle this option
				var toggle = d3.select(this).select("input").property("checked")
				//Update the settings object
				d.n = toggle ? d3.sum(data,function(e){return e[setting.name]==d.label}) : 0 
				d.selected=toggle ? 1 : 0;

				//Update button formatting
				d3.select(this.parentNode).classed("active", toggle)
				d3.select(this.parentNode).select("span.n").html(function(d){return d.n})
				d3.select(this).classed("selected",toggle)//.property("checked", toggle)//.classed("btn-success",toggle)
			}
			
			//Update flags in the data set and annotations on the page
			popExplore.update(canvas, data, settings)
		};

		var checkReset = function(d){
			var setting = d3.select(this.parentNode.parentNode.parentNode).datum();
			setting.levels.forEach(function(level){
				level.n=0;
				level.selected=0;
			});
			var parentList = d3.select(this).node().parentNode.parentNode //Need 2 parents since we wrap <button> in <li>
			d3.select(parentList).selectAll("li").classed("active",false);
			d3.select(parentList).selectAll("li").select("label").classed("selected", false);
			d3.select(parentList).selectAll("li").select("input").property("checked", false)//.classed("btn-success",false)
			d3.select(parentList).selectAll("li").select("span.n").html(function(d){return d.n})
		}

		var addSelector = function(area, setting){
			//Numerator or Denominator? 
			var current = canvas.select("div."+area);
			
			/////////////////////////////////
			//Create categorical selectors
			////////////////////////////////
			if (setting.type == "cat"){
				//create levels summary based on the data and add it to the settings object
				var levellist = d3.set(data.map(function(e){return e[setting.name]})).values()
				setting.levels = levellist.map(function(e){
					return {
							label:e,
							n:d3.sum(data,function(d){return d[setting.name]==e}),
							selected:1
						}
				})

				//add buttons to toggle variable levels
				var seldiv = current.append("div").attr("class", "selector").datum(setting);
				//Create header with "Select All" button
				var selhead = seldiv.append("h3").text(setting.head)
					.append("button").text(" Select All").attr("class","btn btn-default btn-mini btn-xs select-all")
					//Click controls
					.on("click",function(){
						var parentList = d3.select(this).node().parentNode.parentNode //Need 2 parents since we wrap <small> in the <h3>
						//Update button styling
						d3.select(parentList).selectAll("li").classed("active",true)
						d3.select(parentList).selectAll("li").select("span.n").text(function(d){
							d.n = d3.sum(data,function(e){return e[setting.name]==d.label});
						 	return d.n;
						})
						d3.select(parentList).selectAll("li").select("label").classed("selected",true)//.classed("btn-success",true)
							.select("input").property("checked", true)
						//Update settings
						setting.levels.forEach(function(level){
							level.n=d3.sum(data,function(d){return d[setting.name]==level.label});
							level.selected=1;
						})
					
					//Update flags in the data set and annotations on the page
					popExplore.update(canvas, data, settings)
					});
				//Add buttons 
				var ul = seldiv.append("ul").attr("class","categorical");
				var items = ul.selectAll("li")
				.data(setting.levels.sort(function(a,b){return a.label<b.label?-1:1}))
				.enter()
				.append("li").attr("class", "active")
				

				var labels = items.append("label")
				//.text(function(d){return d.label})
				.attr("class","selected")
				labels.append("input")
				.attr("type", "checkbox")
				.property("checked", true)
				labels.on("click",checkClick)
				labels.append("span").text(function(d){return d.label})
				//Annotated Ns
				if(area==="denominator"){
					items.append("span").html(function(d){return d.n}).attr("class","n")
				}

			///////////////////////////////////
			//Create Checklist style selectors
			///////////////////////////////////
			} else if (setting.type == "checklist"){
				//Create detail object and add it to settings object
				setting.details = setting.names.map(function(currentName,i){
					return {
						name:currentName,
						label: setting.labels ? setting.labels[i] : "",
						//n:d3.sum(data,function(e){return e[currentName]==setting.positive}) // leaving this off for now - not sure what the ideal behavior is
						selected:0
					}
				})//.sort(function(a,b){return a.label<b.label?-1:1})

				//Add the buttons to the page
				var seldiv = current.append("div").attr("class", "selector").datum(setting);
				var ul = seldiv.append("ul").attr("class","checklist")
				ul.append("h3").html(setting.head)
				var checks = ul.selectAll("li")
				.data(setting.details)
				.enter()
				.append("li");

				var labels = checks.append("label")
				labels.append("input")
				.attr("type", "checkbox");
				
				labels.on("click",checkClick);
				labels.append("span").text(function(d){return d.label});
	
				//if(area=="numerator"){checks.append("span").html(function(d){return d.n}).attr("class","n")}

			///////////////////////////////////////////
			//Create Numeric (slider) style selectors 
			///////////////////////////////////////////
			} else if (setting.type == "num"){
				setting.cleanName = setting.name.replace(/[^A-Za-z0-9]/g, '')
				setting.range = d3.extent(data,function(d){return +d[setting.name]})
				setting.current = setting.range;
				//var seldiv = current.append("div").attr("class", "selector numeric");
				//var ul_wrap = current.select(".selector.wrapper").empty() ? current.append("div").attr("class","selector numeric wrapper") : current.select(".selector.wrapper");
				var ul = current.append("div").attr("class","selector numeric").attr("id",setting.cleanName).datum(setting)
				ul.append("h3").html(setting.head)
				ul.append("span").attr("class","slider-label min").text(setting.range[0])
				ul.append("span").attr("class","slider-label max").text(setting.range[1])
				ul.append("div").attr("class","range")

				$(ul.node()).find("div.range").slider({
					range: true,
					min: setting.range[0],
					max: setting.range[1],
					values:setting.range,
					slide: function(event, ui){
						//update the labels
						$( "div#"+setting.cleanName+" span.min" ).text( ui.values[ 0 ]);
						$( "div#"+setting.cleanName+" span.max" ).text( ui.values[ 1 ]);

						//update the settings object
						setting.current=[ui.values[0],ui.values[1]]
						
						//Update flags in the data set and annotations on the page
						popExplore.update(canvas,data,settings)
					}
				});
			}
		}
		
		//initialize UI elements for the denominator
		settings.denominator.forEach(function(d){addSelector("denominator",d)})
		//initialize UI elements for the numerator
		settings.numerator.forEach(function(d){addSelector("numerator",d)})

		//initialize the results
		popExplore.update(canvas,data,settings);

		if(settings.preselects){
			var presel_btns = canvas.selectAll(".presel-btn").on("click", function(d){
				//reset so that you start fresh again
				canvas.select(".btn-reset").on("click")();

				d3.select(this).classed("btn-primary", true);
				d.selections.forEach(function(e){
					var current = canvas.select("div."+e.location);
					var selector = current.selectAll(".selector").filter(function(f){
						return f ? f.name === e.name : false;
					});
					if(!selector.empty()){
						if(selector.datum().type === "cat"){
							selector.selectAll("li").select("label").each(checkReset);
							var unchosen = selector.selectAll("li").filter(function(f){
								return e.values.indexOf(f.label) != -1; 
							});
							unchosen.select("label").select("input").property("checked", true);
							unchosen.select("label").each(checkClick);

							popExplore.update(canvas,data,settings);
						}
						else if(selector.datum().type === "num"){
							selector.select("span.min" ).text( e.values[ 0 ]);
							selector.select("span.max" ).text( e.values[ 1 ]);

							//change slide values
							$(".range", selector.node()).slider("values", e.values);
							//update the settings object
							var setting = selector.datum();
							setting.current=[e.values[0],e.values[1]]
							popExplore.update(canvas,data,settings);
						}
						else if(selector.datum().type === "checklist"){
							
						}
					}
					if(e.names){
						var checklists = current.selectAll(".checklist").each(function(checklist){
							var selector = d3.select(this);
							//selector.selectAll("li").select("label").each(checkReset);
							var unchosen = selector.selectAll("li").filter(function(f){
								return e.names.indexOf(f.name) != -1; 
							});
							unchosen.select("label").select("input").property("checked", true);
							unchosen.select("label").each(checkClick);

							popExplore.update(canvas,data,settings);
						})
					};
				})
			});
			var unButton = function(){
				presel_btns.classed("btn-primary", false).classed("btn-default", true);
			};
			//canvas.selectAll(".btn-reset").on("click.presel", unButton);
			canvas.selectAll(".btn.select-all").on("click.presel", unButton);
			canvas.selectAll("input").on("change.presel", unButton);
			$(".range", canvas.node()).on("slide.presel", unButton);
		}
		
	},
	update:function(canvas, data, settings){
		var filterData = function(area, setting){				                        //deselect rows in the data based on the buttons/settings
			if (setting.type == "cat"){													// First, categorical selectors
				setting.levels.filter(function(e){return e.selected==0}) 				//Choose only the incacvite levels
				.forEach(function(level){								 				//For each inactive level
					data.filter(function(d){return d[setting.name] == level.label})		//Find the matching rows
					.forEach(function(d){	
						if(area =="denominator"){d.denominator=0;d.numerator=0;}		//and take them out of the denominator and the numerator OR
						else if(area=="numerator"){d.numerator=0;}						//just take them out of the numerator					
					})																	
				})
			}else if (setting.type == "checklist"){										// Next, Checklist selectors
				setting.details.filter(function(e){return e.selected==1}) 				//Choose only the "checked" options
				.forEach(function(checkbox){								 				//For selected variable
					data.filter(function(d){
						if(+setting.positive[0] && +setting.positive[1]){
							return !+d[checkbox.name] || (+d[checkbox.name] < +setting.positive[0] || +d[checkbox.name] > +setting.positive[1]);
						}
						else{
							return setting.positive.indexOf(d[checkbox.name]) === -1
						}	
					})																	//Find the rows that are *not* 'positive'
					.forEach(function(d){	
						if(area =="denominator"){d.denominator=0;d.numerator=0;}		//and take them out of the denominator and the numerator OR
						else if(area=="numerator"){d.numerator=0;}						//just take them out of the numerator					
					})																	
				})				
			}else if (setting.type == "num"){
				data.filter(function(d){return d[setting.name]<setting.current[0] || d[setting.name]>setting.current[1]}) 
				.forEach(function(d){												//select values outside of the selected range
					if(area =="denominator"){d.denominator=0;d.numerator=0;}		//and take them out of the denominator and the numerator OR
					else if(area=="numerator"){d.numerator=0;}						//just take them out of the numerator					
				})		
			}
		}

		//First set all rows to "selected" 
		data.forEach(function(d){d.numerator=1; d.denominator=1;})
	
		//now deselect rows as needed
		settings.denominator.forEach(function(d){filterData("denominator",d)})
		settings.numerator.forEach(function(d){filterData("numerator",d)})


		//Finally update the values
		var numerator = d3.sum(data,function(d){return d.numerator})
		var denominator = d3.sum(data,function(d){return d.denominator})
		var percentf = d3.format(".1%")
		var percent = denominator > 0 ? percentf(numerator/denominator) : percentf(0); 
		var total = data.length
		var totpercent = percentf(denominator/total)

		canvas.selectAll("span.numerator").html(numerator)
		canvas.selectAll("span.denominator").html(denominator)
		canvas.selectAll("span.percent").html(percent)
		canvas.selectAll("span.total").html(total)
		canvas.selectAll("span.totpercent").html(totpercent)

		if(settings.participantTable){
			var sub = data.filter(function(e){return e.numerator==1 && e.denominator==1});
			var tableCanvas = canvas.select(".participantTable").datum(basicTable.transformPart(sub,settings.participantTable));
			
			//Draw the table
			tableCanvas.select(".ig-basicTable").remove()
			basicTable.layout(tableCanvas,sub,settings.participantTable);
			var sub=basicTable.transform(sub,settings.participantTable);
			basicTable.draw(tableCanvas,sub,settings.participantTable) ;
			//basicTable.nextButton(tableCanvas,sub,settings.participantTable);
		}
		if(settings.viz){
			var x = d3.scale.ordinal()
				.domain(d3.range(0,10))
    			.rangeBands([0, settings.width], .0);
			var y = d3.scale.ordinal()
				.domain(d3.range(0,10))
    			.rangeBands([0, settings.height], .0);

			var den_blocks = settings.svg.selectAll(".den-block")
				.data(d3.range(0, Math.floor((denominator/total)*100)), function(d){return d})
			den_blocks.enter().append("rect")
				.attr("class", "block den-block")
			den_blocks.attr("width", settings.width/10)
				.attr("height", settings.height/10)
				.attr("x", function(d){return x(Math.floor(d/10))})
				.attr("y", function(d){return y(Math.floor(d%10))})
				.attr("fill", "#B4E884")
				.attr("stroke", "white")
				.attr("stroke-width", 2)
			den_blocks.exit().remove();

			//remove all and append fresh so that always on top of denominator blocks
			settings.svg.selectAll(".num-block").remove();
			var num_val = Math.round((numerator/total)*100) > 1 ? Math.round((numerator/total)*100) : Math.ceil((numerator/total)*100);
			var num_blocks = settings.svg.selectAll(".num-block")
				.data(d3.range(0, num_val), function(d){return d})
			num_blocks.enter().append("rect")
				.attr("class", "block num-block")
			num_blocks.attr("width", settings.width/10)
				.attr("height", settings.height/10)
				.attr("x", function(d){return x(Math.floor(d/10))})
				.attr("y", function(d){return y(Math.floor(d%10))})
				.attr("fill", "darkgreen")
				.attr("stroke", "white")
				.attr("stroke-width", 2)
			num_blocks.exit().remove();

		}
	}
}



