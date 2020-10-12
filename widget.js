var TITLEWINDOW = TITLEWINDOW || {};

TITLEWINDOW = {
    // variables for query parameters:
    lookforFields: ['author2_id_str_mv', 'topic_id_str_mv'],

    apiUrl: "https://api.finna.fi/v1/search?",
    authorIdIdentifier: "melinda.(FI-ASTERI-N)",
    fields: ['shortTitle', 'uniformTitles', 'formats', 'nonPresenterAuthors', 'year'],
    /*Available values : relevance, id asc, main_date_str desc, main_date_str asc, callnumber, 
    author, title, last_indexed desc,id asc, first_indexed desc,id asc
    */
    sortOrder: "relevance",
    limit: 100,
    maxResults: 1000, //maximum number of results to be queried from Finna API
    
    language: "fi",
    
    translatedLookforFields: {
        author2_id_str_mv: 'Tekijänä teoksissa',
        topic_id_str_mv: 'Aiheena teoksissa'
    },

    formatTranslations: {
        Image: {fi: 'kuvia', sv: 'bilder', en: 'images'}, 
        Book: {fi: 'kirjoja', sv: 'böcker', en: 'books'}, 
        Sound: {fi: 'äänitteitä', sv: 'ljudspelningar', en: 'sound recordings'}, 
        Journal: {fi: 'lehtiä ja artikkeleita', sv: 'tidskriftar och artiklar', en: 'journals and articles'}, 
        MusicalScore: {fi: 'nuotteja', sv: 'noter', en: 'musical scores'}, 
        Video: {fi: 'videoita', sv: 'video', en: 'videos'}, 
        Thesis: {fi: 'opinnäytteitä', sv: 'examensarbeten', en: 'theses'}
    },
    
    customSortOrder: ['kirjoja', 'äänitteitä', 'nuotteja', 'videoita', 'lehtiä ja artikkeleja', 'kuvia'],
    
    generateQueryString: function(identifier, lookforField, offset=1) {
        identifier = "\"" + TITLEWINDOW.authorIdIdentifier + identifier + "\"";
        var lookfor = "lookfor=" + lookforField + ":" + identifier;
        var url = TITLEWINDOW.apiUrl + lookfor;
        var parameters = {
            "field": TITLEWINDOW.fields,
            "limit": TITLEWINDOW.limit,
            "sort": TITLEWINDOW.sortOrder,
            "page": offset
        }

        $.each(parameters, function(key, value) {
            if (value instanceof Array) {
                $.each(value, function(index) {
                    url += "&" + key + "[]=" + value[index];
                });
            }
            else {
                url += "&" + key + "=" + value;
            }
        });
        return url;
    },
    
    queryFinna: function(url, label) {
        return $.getJSON(url).then(function(data){
            return {
                results:data,
                label:label
            }
        });
    },
    
    manageQueryResults: function(results) {  
        var renderedTitles = Object();
        $.each( results, function( type, value ) {
            var records = Array.prototype.concat.apply([], results[type]);
            var titles = Object();
            $.each( records, function( index, value ) {
                var record = records[index];
                var title = record.shortTitle;
                if (record.uniformTitles.length > 0) {
                    title = record.uniformTitles[0];
                }
                var year = record.year;
                // the hierarchically highest level of format gets chosen
                var recordFormat;
                var valueList = record.formats[0].value.split("/");
                if (valueList.length > 1) {
                     recordFormat = valueList[1];
                }
                if (recordFormat in TITLEWINDOW.formatTranslations) {
                    recordFormat = TITLEWINDOW.formatTranslations[recordFormat][TITLEWINDOW.language];
                    if (recordFormat == 'opinnäytteitä') recordFormat = 'kirjoja';
                    if (titles[recordFormat] === undefined) {
                        titles[recordFormat] = Object(); 
                    }
                    if (titles[recordFormat][title.toLowerCase()] === undefined) {
                        titles[recordFormat][title.toLowerCase()] = {'title': title, 'year': year};
                    }
                    else {
                        // if the same title is in uppercase, 
                        // it is replaced by title with one or more lowercase letters
                        recordTitle = titles[recordFormat][title.toLowerCase()].title;
                        recordYear = titles[recordFormat][title.toLowerCase()].year;
                        if (parseInt(recordYear) > parseInt(year)) {
                            recordYear = titles[recordFormat][title.toLowerCase()].year = year;
                        }
                        if (title.toUpperCase() !== title && title !== recordTitle) {
                            titles[recordFormat][title.toLowerCase()].title = title;
                        }  
                    }
                }     
            });
            
            var translatedType = TITLEWINDOW.translatedLookforFields[type];
            renderedTitles[translatedType] = Object();

          
           $.each( TITLEWINDOW.customSortOrder, function (index) {
                var format = TITLEWINDOW.customSortOrder[index];
                if (format in titles) {
                    renderedTitles[translatedType][format] = [];
                    $.each( titles[format], function (title, record) {
                        var recordName = record.title; 
                        if (record.year !== undefined) {
                            recordName += " (" + record.year + ")";
                        }
                        renderedTitles[translatedType][format].push(recordName);
                    });
                }
            });
        });     

        return renderedTitles;
       
    },
    
    render: function(object) {
        var noteText = [];
        if (jQuery.isEmptyObject(object)) {
            noteText.push('Tekijälle ei löydy julkaisuja.');
            noteText.push('Tietoja tekijään liittyvistä aineistosta haettu kansallisbibliografiasta Finnan kautta.');
        }
        else {
            noteText.push('Tiedot tekijään liittyvistä aineistosta haettu kansallisbibliografiasta Finnan kautta.');
                       
        }
        noteText.push('HUOM! Linkitykset musiikkiaineistoon ovat toistaiseksi puutteellisia.');
        var data = {
                notes: noteText
            };
        var source = $("#finaf-template").html();
		var template = Handlebars.compile(source);
        $('.concept-info').after(template(data));
        var listId = 0;
        $.each( object, function( key, value ) {
            var $paragraph = $( "<div class='paragraph'></div>" );
            var $header = $( "<div class='versal-bold'><p>"+key.toUpperCase()+"</p></div>");
            $paragraph.appendTo("#titles");
            $paragraph.append( $header);
            $.each ( value, function (format, titleList) {
                listId += 1;
                var titleNumber = 0;
                var $listHeader = $( "<p class='versal'>"+format.toUpperCase()+"</p> ");
                var $list = $( "<ul></ul> ");
                $list.attr('id', "list" + listId);
                $paragraph.append( $listHeader, $list);
                $.each( titleList, function (title, record) {
                    titleNumber += 1;
                    var $titleText = $ ( "<li classstyle='text-align:left'>"+record+"</li>");
                    if (titleNumber > 5) {
                        $titleText.addClass( "hideable" );
                    }
                    $list.append( $titleText );
                });
                if (titleNumber > 5) { 
                    var $button = $ ( "<a>Näytä kaikki<i class='arrow down'></i></a>");
                    $list.append( $button );
                    var classId = "list" + listId;
                    $button.click(function(e){
                        $("#" + classId + " .hideable").toggle();
                        if ($("#" + classId + " .hideable").is(':visible')) {
                            $button.html("Näytä vähemmän<i class='arrow up'>");
                        }
                        else {
                            $button.html("Näytä kaikki<i class='arrow down'>");
                        }
                    });
                }
           });  
       });
       $(".hideable").hide();
    }
};

$(function() {

    window.title_window = function(data) {
        // Only activate the widget when
        // 1) on an authority page
        // 2) and there is a prefLabel
        // 3) and the json-ld data can be found
        // 4) and there is an identifier
        if (data.page !== 'page' || data.prefLabels === undefined || $.isEmptyObject(data["json-ld"])) {
            return;
        }
        var identifier;
        var uri = data['uri'];
        $.each(data['json-ld'].graph, function (key, value) {
            if (value.type == "skos:ConceptScheme") {
                identifier = uri.replace(value.uri, "");
                        
                }
        });
        if (!identifier) {
            return;
        }
        var queries = [];
        $.each (TITLEWINDOW.lookforFields, function (index, field) {
            var restURL = TITLEWINDOW.generateQueryString(identifier, field);
            var query = TITLEWINDOW.queryFinna(restURL, field);
            queries.push(query);
        });
        
        var records = Object();
        var results = [];
        
        $.when.apply($, queries).done(function() {
            var args = Array.prototype.slice.call(arguments);
            var resultCounts = [];
            $.each(args, function (index, value) {
                var resultCount = value.results.resultCount;
                resultCounts[index] = resultCount;
                if (resultCount > 0) {
                    records[value.label] = [value.results.records];
                }
            });
            var queries = [];
            $.each(resultCounts, function(index, value) {
                if (value > TITLEWINDOW.maxResults) {
                    value = TITLEWINDOW.maxResults;
                }
                if (value > TITLEWINDOW.limit) {
                    var queryNumber = Math.ceil(value / TITLEWINDOW.limit);
                    for (var i = 2; i <= queryNumber; i++) {
                        var field = TITLEWINDOW.lookforFields[index];
                        var restURL = TITLEWINDOW.generateQueryString(identifier, field, i);
                        var query = TITLEWINDOW.queryFinna(restURL, field);
                        queries.push(query);
                    }
                }
            });
            if (queries) {
                $.when.apply($, queries).done(function() {
                    var args = Array.prototype.slice.call(arguments);
                    $.each(args, function (index, value) {
                        records[value.label].push(value.results.records);
                    });
                    records = TITLEWINDOW.manageQueryResults(records);
                    TITLEWINDOW.render(records);
                }); 
            }
            else {
                records = TITLEWINDOW.manageQueryResults(records);
                TITLEWINDOW.render(records);
            }
        });
    }

});







        


