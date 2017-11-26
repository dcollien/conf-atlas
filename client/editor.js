var editorElem = document.getElementById('editor');
var simplemde = new SimpleMDE({ element: document.getElementById('ed-description') });
var ed_relElem = document.getElementById('ed-rels-fwd');
var ed_revRelElem = document.getElementById('ed-rels-rev');
var ed_saveElm = document.getElementById('ed-save');
var ed_titleElm = document.getElementById('ed-title');

var save = function(data, callback) {
    fetch('save', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(function(res) {
        callback(null);
    }).catch(function(res) {
        callback(res);
    });
};

var Editor = {
    _saveHandlers: [],
    _tagInputs: [],
    _revLookup: {},
    _id: null,

    init: function(relLabels, revRelLabels, relColors, state) {
        var pages = state.nodes;
        Editor._state = state;
        Editor._revLookup = {};
        var pageNames = pages.map(function(page) { 
            Editor._revLookup[page.data.name] = page.data.id;
            return page.data.name;
        });

        console.log(pageNames);

        editorElem.addEventListener('click', function(evt) {
            if (evt.target === evt.currentTarget) {
                Editor.hide();
            }
        });

        Object.keys(relLabels).forEach(function(rel) {
            var label = relLabels[rel];
            var child = document.createElement('div');
            child.innerText = label + ':';
            var listInput = document.createElement('input');
            listInput.name = 'ed-' + rel;

            child.appendChild(listInput);
            child.style.color = relColors[rel];
            ed_relElem.appendChild(child);

            var tagify = new Tagify(listInput, {whitelist: pageNames, enforeWhitelist: true, suggestionsMinChars:0});
            Editor._tagInputs.push({rel: rel, reverse: false, tagify: tagify});
            listInput.dataset['tagify'] = tagify;
        });

        Object.keys(revRelLabels).forEach(function(rel) {
            var label = revRelLabels[rel];
            var child = document.createElement('div');
            child.innerText = label + ':';
            var listInput = document.createElement('input');
            listInput.name = 'ed-rev-' + rel;
            
            child.appendChild(listInput);
            child.style.color = relColors[rel];
            ed_revRelElem.appendChild(child);

            var tagify = new Tagify(listInput, {whitelist: pageNames, enforeWhitelist: true, suggestionsMinChars:0});
            Editor._tagInputs.push({rel: rel, reverse: true, tagify: tagify});
            listInput.dataset['tagify'] = tagify;
        });

        ed_saveElm.addEventListener('click', function() {
            var edges = [];

            Editor._tagInputs.forEach(function(input) {
                var relatedPages = input.tagify.value;
                relatedPages.forEach(function(page) {
                    var source, target;
                    if (!input.reverse) {
                        source = Editor._revLookup[page];
                        target = Editor._id;
                    } else {
                        source = Editor._id;
                        target = Editor._revLookup[page];
                    }

                    edges.push({source: source, target: target, rel: input.rel});
                });
            });

            var description = simplemde.value();
            var title = ed_titleElm.value;

            console.log(description, title, Editor._id, edges);

            var saveData = {
                description: description,
                edges: edges,
                id: Editor._id,
                title: title
            };

            save(saveData, function(err) {
                if (err) {
                    alert(err);
                    return;
                }

                Editor._saveHandlers.forEach(function(handler) { 
                    handler(saveData);
                });

                Editor.hide();
            });
        });
    },

    show: function(document) {
        editorElem.style.display = 'block';
        Editor.reset();

        if (!document) {
            Editor._id = Math.random().toString(36).substr(2, 9);
        }
    },

    hide: function() {
        editorElem.style.display = 'none';
    },

    reset: function() {
        document.getElementById('ed-title').value = '';
        simplemde.value('');

        Editor._tagInputs.forEach(function(input) {
            input.tagify.removeAllTags();
        });
    },

    addSaveHandler: function(handler) {
       Editor._saveHandlers.push(handler);
    }
};
