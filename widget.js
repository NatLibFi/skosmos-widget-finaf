var TITLEWINDOW = TITLEWINDOW || {};

TITLEWINDOW = {
    // variables for query parameters:
    lookforFields: ['author2_id_str_mv', 'topic_id_str_mv'],

    apiUrl: "https://api.finna.fi/v1/search?",
    authorIdIdentifier: "melinda.(FI-ASTERI-N)",
    finnaURL: "https://kansalliskirjasto.finna.fi/",
    recordPrefix: "Record/",
    authorPrefix: "AuthorityRecord/melinda.(FI-ASTERI-N)",
    languageSuffix: {fi:'?lng=fi', sv: '?lng=sv', en: '?lng=en'},
    institution: "building:\"0\/NLF\/\"",
    filters: ['building:"0/NLF/"', 'finna.deduplication:"0"'],
    fields: ['shortTitle', 'OtherRecordLink', 'formats', 'id', 'year'],
    /*Available values : relevance, id asc, main_date_str desc, main_date_str asc, callnumber,
    author, title, last_indexed desc,id asc, first_indexed desc,id asc
    */
    sortOrder: "main_date_str desc",
    limit: 100,
    maxResults: 1000, //maximum number of results to be queried from Finna API

    language: "fi",

    translatedLookforFields: {
        author2_id_str_mv: {fi: 'Tekijänä teoksissa', sv: 'upphov för verken', en: 'as author'},
        topic_id_str_mv: {fi: 'Aiheena teoksissa', sv: 'ämne i verken', en: 'as topic'}
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

    customSortOrder: ['Book', 'Sound', 'MusicalScore', 'Video', 'Journal', 'Image'],

    fonts: {
        Image: 'image',
        Book: 'book',
        Sound: 'compact-disc',
        Journal: 'file-lines',
        MusicalScore: 'music',
        Video: 'film',
    },

    noteTexts: {
        error: {fi: 'Tekijälle ei löydy julkaisuja.',
            sv: 'Inga utgåvor hittas för upphovspersonen.',
            en: 'No publications found for the author.'
        },
        source: {fi: 'Tietoja toimijaan liittyvästä aineistosta haettu kansallisbibliografiasta Finnan kautta.',
            sv: 'Information om material som relaterar till aktören har sökts från nationalbibliografin med Finna.',
            en: 'Information about authors’ publications is received from national bibliography from Finna.'
        }
    },

    buttonTexts: {
        more: {fi: 'Näytä kaikki', sv: 'Visa allt', en: 'Show all'},
        less: {fi: 'Näytä vähemmän', sv: 'Visa mindre', en: 'Show less'}
    },

    finnaSearchTexts: {
        fi: 'Katso hakutulokset Kansalliskirjaston hakupalvelusta',
        sv: 'Se alla sökresultat från söktjänst för Nationalbiblioteket',
        en: 'See all the results from the National Library Search'
    },

    generateQueryString: function(identifier, lookforField, offset) {
        identifier = "\"" + TITLEWINDOW.authorIdIdentifier + identifier + "\"";
        var lookfor = "lookfor=" + lookforField + ":" + identifier;
        var url = TITLEWINDOW.apiUrl + lookfor;
        var parameters = {
            "field": TITLEWINDOW.fields,
            "filter": TITLEWINDOW.filters,
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
                var url = TITLEWINDOW.finnaURL + TITLEWINDOW.recordPrefix + record.id;
                var year = record.year;
                // the hierarchically highest level of format gets chosen
                var recordFormat;
                var valueList = record.formats[0].value.split("/");
                if (valueList.length > 1) {
                     recordFormat = valueList[1];
                }
                if (recordFormat in TITLEWINDOW.formatTranslations) {
                    if (recordFormat == 'Thesis') recordFormat = 'Book';
                    if (titles[recordFormat] === undefined) {
                        titles[recordFormat] = Object();
                    }
                    if (titles[recordFormat][title.toLowerCase()] === undefined) {
                        titles[recordFormat][title.toLowerCase()] = {'title': title, 'year': year, 'url': url};
                    }
                    else {
                        // if the same title is in uppercase,
                        // it is replaced by title with one or more lowercase letters
                        recordTitle = titles[recordFormat][title.toLowerCase()].title;
                        recordYear = titles[recordFormat][title.toLowerCase()].year;
                        if (parseInt(recordYear) > parseInt(year)) {
                            recordYear = titles[recordFormat][title.toLowerCase()].year = recordYear;
                        }

                        if (title.toUpperCase() !== title && title !== recordTitle) {
                            titles[recordFormat][title.toLowerCase()].title = title;
                        }
                    }
                }
            });

            var translatedType = TITLEWINDOW.translatedLookforFields[type][TITLEWINDOW.language];
            renderedTitles[translatedType] = Object();

           $.each( TITLEWINDOW.customSortOrder, function (index) {
                var recordFormat = TITLEWINDOW.customSortOrder[index];
                var renderedFormat = TITLEWINDOW.formatTranslations[recordFormat][TITLEWINDOW.language];
                if (recordFormat in titles) {
                    renderedTitles[translatedType][renderedFormat] = [];
                    $.each( titles[recordFormat], function (title, record) {
                        var recordName = record.title;

                        renderedTitles[translatedType][renderedFormat].push({"title": recordName,
                        "year": record.year, "url": record.url});
                    });
                }
            });
        });

        return renderedTitles;

    },

    render: function(identifier, object) {
        var noteText = "";
        if (jQuery.isEmptyObject(object)) noteText += TITLEWINDOW.noteTexts['error'][TITLEWINDOW.language] + " ";
        noteText += TITLEWINDOW.noteTexts['source'][TITLEWINDOW.language];
        var data = {
                note: noteText
            };
        var source = $("#finaf-template").html();
		var template = Handlebars.compile(source);
        $('#content-bottom').append(template(data));
        var listId = 0;
        $.each( object, function( key, value ) {
            if (Object.keys(value).length > 0) {
                var $paragraph = $( "<div class='paragraph'></div>" );
                var $header = $( "<div><h3 class='versal-bold'>"+key.toUpperCase()+"</h3></div>");
                $paragraph.appendTo("#titles");
                $paragraph.append( $header);
                $.each ( value, function (format, titleList) {
                    listId += 1;
                    var titleNumber = 0;
                    var $listHeader = $( "<h3 class='versal-bold'>"+format.toUpperCase()+"</h3> ");
                    var originalFormat;
                    $.each (TITLEWINDOW.formatTranslations, function (key, value) {
                        if (value[TITLEWINDOW.language] == format) {
                            originalFormat = key;
                        }
                    });
                    var $image = $( "<span class='fa-solid fa-"+TITLEWINDOW.fonts[originalFormat]+"'></span> ");
                    $listHeader.append($image);
                    var $list = $( "<ul class='works-list'></ul> ");
                    $list.attr('id', "list" + listId);
                    $paragraph.append( $listHeader, $list);
                    $.each( titleList, function (title, record) {
                        titleNumber += 1;
                        var year = "";
                        if (record.year !== undefined) {
                                year += " (" + record.year + ")";
                            }
                        if (record.title.length > 90) {
                            record.title = record.title.substr(0, 90) + " [...]";
                        }
                        var $titleText = $ ( "<li style='text-align:left'><a href="
                            +record.url+TITLEWINDOW.languageSuffix[TITLEWINDOW.language]
                            +" target='_blank'>"+record.title+"</a>"+year+"</li>");
                        if (titleNumber > 5) {
                            $titleText.addClass( "hideable" );
                        }
                        $list.append( $titleText );
                    });
                    if (titleNumber > 5) {
                        var $button = $ ( "<a class='toggle-text versal'>"
                            +TITLEWINDOW.buttonTexts['more'][TITLEWINDOW.language].toUpperCase()
                            +"<i class='triangle-down'></i></a>");
                        $button.css({ 'color': '#333333'});
                        $list.append( $button );
                        var classId = "list" + listId;
                        $button.click(function(e){
                            $("#" + classId + " .hideable").toggle();
                            if ($("#" + classId + " .hideable").is(':visible')) {
                                $button.html(TITLEWINDOW.buttonTexts['less'][TITLEWINDOW.language].toUpperCase()
                                +"<i class='triangle-up'>");
                            }
                            else {
                                $button.html(TITLEWINDOW.buttonTexts['more'][TITLEWINDOW.language].toUpperCase()
                                +"<i class='triangle-down'>");
                            }
                        });
                    }
                });
            }
       });
       $("#finna-search").html("<a class='versal' href="+TITLEWINDOW.finnaURL+TITLEWINDOW.authorPrefix+identifier
       +TITLEWINDOW.languageSuffix[TITLEWINDOW.language]+" target='_blank'>"
       +TITLEWINDOW.finnaSearchTexts[TITLEWINDOW.language]+"</a>");
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
        TITLEWINDOW.language = lang;
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
            var restURL = TITLEWINDOW.generateQueryString(identifier, field, 1);
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
                    TITLEWINDOW.render(identifier, records);
                });
            }
            else {
                records = TITLEWINDOW.manageQueryResults(records);
                TITLEWINDOW.render(identifier, records);
            }
        });
    }

});
