////////////////////////////////////////////////////////////////
// Reusable component to create simple html tables with d3.js 
// Sample Function Call
// basicTable.init(
// //element
// "div#table",
// //path
// "h:/test.csv",
// //settings
// {next:true,start:1,n:50, cols:["studyid","year","season","exac"]} //settings go here
// )
//
//////////////////////////////////////////////////////////////////


basicTable = {
	//Load the data from <<path>> and call needed routines to create the interactive graphic
	init: function(element, path, settings, predata){ //REQUIRED
		if(settings.data_tables){
			settings.paginate = false;
			settings.start = 1;
			settings.n = null;
		}
		function startup(data){
			var canvas = d3.select(element)
			basicTable.layout(canvas,data,settings)
			var sub=basicTable.transform(data,settings)
			basicTable.draw(canvas,sub,settings) 
		}
		if(path && !predata){
	      d3.csv(path, function(error, csv){
	        startup(csv);
	      })
	    }
	    else{
	      startup(predata)
	    }
	},

	//Add needed structure to <<canvas>>
	layout: function(canvas, data ,settings){
		var wrapper=canvas.append("div").attr("class","ig-basicTable") //REQUIRED

		if(settings.paginate){
			canvas.select("div.ig-basicTable").append("button")
				.attr("class", settings.start == 1 ? "btn btn-default btn-mini btn-xs disabled" : "btn btn-mini btn-xs btn-default")
				.html("<i class='glyphicon glyphicon-arrow-left icon-arrow-left'></i>")
				.on("click",function(d){
					var nextSettings = settings;
					nextSettings.start -= nextSettings.start == 1 ? 0 : nextSettings.n

					basicTable.wipe(canvas)
					basicTable.layout(canvas,data,nextSettings)
					var sub=basicTable.transform(data,nextSettings)
					basicTable.draw(canvas,sub,nextSettings) 
					//basicTable.nextButton(canvas,data,settings)
				});

			canvas.select("div.ig-basicTable").append("button")
				.attr("class", "pull-right")
				.attr("class", settings.start + settings.n >= data.length ? "btn btn-default btn-mini btn-xs disabled pull-right" : "btn btn-default btn-mini btn-xs pull-right")
				.html("<i class='glyphicon glyphicon-arrow-right icon-arrow-right'></i>")
				.on("click",function(d){
					if(settings.start + settings.n <= data.length){
						var nextSettings = settings
						nextSettings.start += nextSettings.n
			
						basicTable.wipe(canvas)
						basicTable.layout(canvas,data,nextSettings);
						var sub=basicTable.transform(data,nextSettings)
						basicTable.draw(canvas,sub,nextSettings); 
						//basicTable.nextButton(canvas,data,settings)
					};
				});	
		}
		if(settings.printable){
			var print_button = canvas.select("div.ig-basicTable").append("a")
				.attr("class", "btn btn-xs btn-mini btn-primary print-btn")
				.text("Printer-friendly view");
			print_button.on("click", function(){
				var print_table_settings = {cols: settings.cols, headers: settings.headers, start: 1};
				var print_canvas = d3.select("body").append("div").attr("id", "print-table");
				var sub = basicTable.transform(data, settings);
				//Draw the table
				basicTable.layout(print_canvas,sub,print_table_settings);
				var sub=basicTable.transform(sub,print_table_settings);
				basicTable.draw(print_canvas,sub,print_table_settings) ;

				var print_window = window.open("","Print Table","");
				var XMLS = new XMLSerializer(); 
				//console.log(XMLS.serializeToString(participantTable.node()))
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
			});
		}
	},

	//Prepare <<data>> for basicTable.draw()
	transform: function(data, settings){
		var colList = settings.cols ? settings.cols : d3.keys(data[0]);
		settings.cols = colList;
		var subCols = data.map(function(e){
			var current = {}
			colList.forEach(function(colName){current[colName]=e[colName]})
			return current;
		}) 
		var rowStart = settings.start ? settings.start-1 : 0 ;
		var rowCount = settings.n ? settings.n : data.length 
		var subRows = subCols.slice(rowStart, rowStart+rowCount)
		return subRows
	},

	transformPart: function(data, settings){
		var colList = settings.cols ? settings.cols : d3.keys(data[0])
		var subCols = data.map(function(e){
			var current = {}
			colList.forEach(function(colName){current[colName]=e[colName]})
			return current;
		});
		return subCols;
	},

	//Create the table for the given <<data>> according to <<settings>>
	draw: function(canvas, data, settings){
		//add table
		var table = canvas.select("div.ig-basicTable").insert("table", "button").attr("class","table").datum(settings) //stores current display info for next button
		
		//make a header
		var header_data = settings.headers ? settings.headers : d3.keys(data[0]);
		headerRow = table.append("thead").append("tr")
		headerRow.selectAll("th").data(header_data).enter().append("th").html(function(d){return d});

		//add table rows (1 per svg row)
		var tbody = table.append("tbody")
		var rows = tbody.selectAll("tr").data(data).enter().append("tr")

		//add columns (once per row)
		var cols = rows
			.selectAll("tr")
			.data(function(d){return d3.values(d)})
			.enter()
			.append("td")
			.html(function(d){return d});

		if(settings.data_tables){
			if(jQuery() && jQuery().dataTable){
				$(table.node()).dataTable({'searching': Boolean(settings.searchable)});
				var print_btn = $(".print-btn", canvas.node());
				print_btn.addClass("pull-right");
				$(".dataTables_wrapper").prepend( print_btn )
			}
			else{
				throw new Error("dataTables jQuery plugin not available");
			}
		}
	},

	wipe: function(canvas){
		canvas.select("div.ig-basicTable").remove()
	}
}