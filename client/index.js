var listingElem = document.getElementById('list');
var cyElem = document.getElementById('cy');
var titleElem = document.getElementById('title');
var descElem = document.getElementById('description');
var relsElem = document.getElementById('forward');
var revRelsElem = document.getElementById('reverse');
var addElem = document.getElementById('addbtn');

var relColors = {
    "builds": "#c00",
    "kind": "#c0c",
    "part": "#0c0",
    "related": "#aaa"
};

var relLabels = {
    "builds": "Is derived from",
    "kind": "Is a type of",
    "part": "Is a part of"
};

var revRelLabels = {
    "builds": "Has derived",
    "kind": "Has sub-types",
    "part": "Has parts"
};

var parseRel = function(edge) {
    return {
        source: edge.source,
        target: edge.target,
        rel: edge.rel,
        name: relLabels[edge.rel],
        color: relColors[edge.rel]
    };
};

var mdConvert = new showdown.Converter();

var cyStyle = cytoscape.stylesheet()
.selector('node')
.css({
    'content': 'data(name)',
    'text-valign': 'center',
    'color': 'white',
    'text-outline-width': 2,
    'background-color': '#999',
    'text-outline-color': '#999'
})
.selector('edge')
.css({
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    'target-arrow-color': 'data(color)',
    'line-color': 'data(color)',
    'width': 1
})
.selector(':selected')
.css({
    'background-color': 'black',
    'line-color': 'black',
    'target-arrow-color': 'black',
    'source-arrow-color': 'black'
})
.selector('.faded')
.css({
    'opacity': 0.25,
    'text-opacity': 0
});

var relElems = {};
var revRelElems = {};
Object.keys(relLabels).forEach(function(rel) {
    var relElem = document.createElement('div');
    relElem.style.color = relColors[rel];
    relElem.innerText = relLabels[rel] + ':';
    relsElem.appendChild(relElem);

    var relElemInner = document.createElement('div');
    relElemInner.className = "relations";
    relElem.appendChild(relElemInner);
    
    relElems[rel] = relElemInner;
});

Object.keys(revRelLabels).forEach(function(rel) {
    var relElem = document.createElement('div');
    relElem.style.color = relColors[rel];
    relElem.innerText = revRelLabels[rel] + ':';
    revRelsElem.appendChild(relElem);

    var relElemInner = document.createElement('div');
    relElemInner.className = "relations";
    relElem.appendChild(relElemInner);

    revRelElems[rel] = relElemInner;
});

fetch('data.json').then(function(response) {
    var state = {
        nodes: [],
        edges: []
    };
    
    response.json().then(function(data) {
        data.nodes.sort(function(a, b) {
            return a.name > b.name;
        });
        state.edges = data.edges.map(function(edge) {
            return {data: parseRel(edge)};
        });
        state.nodes = data.nodes.map(function(node) {
            return {data: node};
        });
        state.descriptions = data.descriptions;

        data.nodes.forEach(function(node) {
            var itemElement = document.createElement("li");
            itemElement.innerText = node.name;
            itemElement.dataset['id'] = node.id;
            listingElem.appendChild(itemElement);
        });

        init(state);
    });
});

var init = function(state) {
    addElem.addEventListener('click', function() {
        Editor.show();
    });

    Editor.init(relLabels, revRelLabels, relColors, state);

    var layout = {
        name: 'breadthfirst'
    };

    var cy = cytoscape({
        container: cyElem,
    
        boxSelectionEnabled: false,
        autounselectify: true,
    
        style: cyStyle,
    
        elements: {
            nodes: state.nodes,
            edges: state.edges
        }
    });
    cy.layout(layout).run();

    Editor.addSaveHandler(function(data) {
        cy.add({
            group: "nodes",
            data: {id: data.id, name: data.title}
        });
        cy.add(data.edges.map(function(edge) {
            return {
                group: "edges",
                data: parseRel(edge)
            }
        }));
        cy.layout(layout).run();

        state.descriptions[data.id] = data.description;

        var id = data.id;
        if (id && cy.nodes('#' + id)[0]) {
            goTo(cy.nodes('#' + id)[0], true);
        }
    });

    var goTo = function(node, animate) {
        var data = node.data();
        
        //cy.center(node);
        if (animate) {
            cy.animate(
                {  
                    center: {eles: node}
                },
                {
                    duration: 500
                }
            );
        }

        history.pushState({id: data.id}, data.name, "#" + data.id);

        setTimeout(function() {
            titleElem.innerText = data.name;
            descElem.innerHTML = mdConvert.makeHtml(state.descriptions[data.id]);
    
            // clear relationships
            Object.keys(relElems).forEach(function(rel) {
                relElems[rel].innerHTML = '';
                relElems[rel].parentNode.style.display = "none";
                revRelElems[rel].innerHTML = '';
                revRelElems[rel].parentNode.style.display = "none";
            });
    
            var adjacencies = cy.edges('[source="' + data.id + '"], [target="' + data.id + '"]');
            adjacencies.forEach(function(edge) {
                var edgeData = edge.data();
                if (relElems[edgeData.rel]) {
                    var otherNode;
                    var isReverse = false;
                    if (edgeData.target === data.id) {
                        otherNode = cy.nodes('#' + edgeData.source)[0];
                    } else {
                        otherNode = cy.nodes('#' + edgeData.target)[0];
                        isReverse = true;
                    }
    
                    var child = document.createElement('span');
                    child.className = "relation";
                    child.innerText = otherNode.data().name;
                    (function(clickNode) {
                        child.addEventListener('click', function(evt) {
                            goTo(clickNode, true);
                        });
                    })(otherNode);
    
                    if (isReverse) {
                        revRelElems[edgeData.rel].appendChild(child);
                        revRelElems[edgeData.rel].parentNode.style.display = "block";
                    } else {
                        relElems[edgeData.rel].appendChild(child);
                        relElems[edgeData.rel].parentNode.style.display = "block";
                    }
                }
            });
    
            if (animate) {
                cy.resize();
            }
        }, 1);
    };

    if (window.location.hash) {
        var id = window.location.hash.substring(1);
        if (id && cy.nodes('#' + id)[0]) {
            goTo(cy.nodes('#' + id)[0], true);
        }
    }

    window.onhashchange = function(evt) {
        var id = window.location.hash.substring(1);
        if (id && cy.nodes('#' + id)[0]) {
            goTo(cy.nodes('#' + id)[0], true);
        }
    };

    window.onpopstate = function(evt) {
        var id = event.state.id;
        if (id && cy.nodes('#' + id)[0]) {
            goTo(cy.nodes('#' + id)[0], true);
        }
    };
    
    listingElem.addEventListener('click', function(evt) {
        var id = evt.target.dataset.id;
        if (id && cy.nodes('#' + id)[0]) {
            goTo(cy.nodes('#' + id)[0], true);
        }
    });
    
    cy.on('tap', 'node', function(e) {
        var node = e.target;
    
        var neighborhood = node.neighborhood().add(node);
        goTo(node);
    
        cy.elements().addClass('faded');
        neighborhood.removeClass('faded');
    });
    
    cy.on('tap', function(e){
        if( e.target === cy ){
            cy.elements().removeClass('faded');
        }
    });    
};
