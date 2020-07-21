var TITLEWINDOW = TITLEWINDOW || {};

TITLEWINDOW = {
    // variables for query parameters:
    lookforFields: ['author2_id_str_mv', 'topic_id_str_mv'],

    apiUrl: "https://api.finna.fi/v1/search?",
    authorIdIdentifier: "melinda.(FI-ASTERI-N)",
    fields: ['shortTitle', 'uniformTitles', 'formats', 'year'],
    sortOrder: "main_date_str asc",
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
                    if (titles[recordFormat] === undefined) {
                        titles[recordFormat] = Object(); 
                    }
                    if (titles[recordFormat][title.toLowerCase()] === undefined) {
                        titles[recordFormat][title.toLowerCase()] = {'title': title, 'year': year};
                    }
                    else {
                        // if the same title is in uppercase, 
                        // it is replaced by title with one or more lowercase letters
                        recordTitle = titles[recordFormat][title.toLowerCase()].title
                        if (title.toUpperCase() !== title && title !== recordTitle) {
                            titles[recordFormat][title.toLowerCase()].title = title;
                        }  
                    }
                }

                
            });
            translatedType = TITLEWINDOW.translatedLookforFields[type]
            renderedTitles[translatedType] = Object();
            $.each( titles, function (format, value) {
                renderedTitles[translatedType][format] = [];
                $.each( titles[format], function (title, record) {
                    recordName = record.title + " (" + record.year + ")";
                    renderedTitles[translatedType][format].push(recordName);
                });
            });
        });     
        TITLEWINDOW.render(renderedTitles);
       
    },
    
    render: function(object) {
        var data = {
                titles: object
            };
        var source = $("#finaf-template").html();
		var template = Handlebars.compile(source);
        $('.concept-info').after(template(data));
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
                    TITLEWINDOW.manageQueryResults(records);
                }); 
            }
            else {
                TITLEWINDOW.manageQueryResults(records);
            }
        });
    }

});







        


