var yolandaUrl = 'http://localhost:3100'; //'https://api.rainbird.ai';

var columns = [];

var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
        //d.x += d3.event.dx;
        d.y += d3.event.dy;
        d.fact.subject.selected = true;
        recalculate();
        d3.select(this).attr("transform", function(d,i){
            return "translate(" + [ d.x,d.y ] + ")"
        })
    })
    .on("dragstart", function() {
        d3.event.sourceEvent.stopPropagation();
    });

var pan = d3.behavior.drag()
    .on("drag", function(d,i) {
        d.x -= d3.event.dx;
        d.y -= d3.event.dy;
        d3.select(this).attr("viewBox", function(d,i){
            return "" + [ d.x,d.y ] + " 700 600"
        })
    });

function zoom() {
    d3.select(this).select('g').attr('transform', 'scale(' + d3.event.scale +
        ',' + d3.event.scale + ')');
}
var zoomer = d3.behavior.zoom()
    .on("zoom", zoom);
d3.select('svg')
    .call(zoomer);

var radius = 5;

var conceptInstances = [];

d3.select('#go').on('click', start);

function start() {

    d3.select('svg')
        .datum({x:0, y:0})
        .call(pan);

    getFact(d3.select('#factID').property('value'), function(fact) {
        d3.select('div')
            .select('header')
            .text(fact.fact.subject.value + ' ' + fact.fact.relationship.type + ' ' + fact.fact.object.value);

        addNode(fact, 0);
    });
}

function getConceptInstance(conceptInstance) {
    for(var i = 0 ; i < conceptInstances.length; i++) {
        if(conceptInstances[i].type === conceptInstance.type &&
            conceptInstances[i].value === conceptInstance.value) {
            return conceptInstances[i];
        }
    }
    return null;
}

function addNode(node, depth, parent) {
    addToColumn(node, depth);
    if (!getConceptInstance(node.fact.subject)) {
        node.fact.subject.selected = false;
        conceptInstances.push(node.fact.subject);
    }
    if (!getConceptInstance(node.fact.relationship)) {
        node.fact.relationship.selected = false;
        conceptInstances.push(node.fact.relationship);
    }
    if (!getConceptInstance(node.fact.object)) {
        node.fact.subject.object = false;
        conceptInstances.push(node.fact.object);
    }

    var nodeHolder = d3.select('g')
        .append('g');

    nodeHolder.datum(function() {
        if (parent) {
            node.parent = parent;
        }
        return node;
    });
    nodeHolder
        .attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')'
            });

    nodeHolder.call(drag);

    nodeHolder
        .append('rect')
        .attr('rx', radius)
        .attr('rt', radius);

    var color;
    switch(node.source) {
        case 'rule':
            color = 'blue';
            break;
        case 'datasource':
            color = 'green';
            break;
        case 'answer':
            color = 'red';
            break;
        default:
            color = 'yellow';
            break;
    }
    nodeHolder.attr('class', '.nodeHolder ' + color);

    var headerHolder = nodeHolder
        .append('g')
        .classed('headerHolder', true);
    headerHolder
        .append('text')
        .attr('y', 15)
        .text(node.fact.subject.value + ' ' +
            node.fact.relationship.type + ' ' +
            node.fact.object.value + ' '
            + node.fact.certainty + '%');
    headerHolder
        .append('text')
        .attr('y', 30)
        .text(getSource(node.source));
    headerHolder
        .append('text')
        .attr('class', getIcon(node.factID));

    var rowHolder = nodeHolder.append('g').classed('rowHolder', true);
    rowHolder
        .append('rect')
        .classed('white', true);
    var subjectHolder = rowHolder
        .append('g')
        .attr('transform', 'translate(0, 0)')
        .attr('class', 'subjectHolder holder');
    subjectHolder
        .append('rect')
        .classed(getColor(node.factID), true);
        /*.on('mouseenter', function(d) {
            getConceptInstance(node.fact.subject).selected = true;
            console.log('in', conceptInstances[0]);
            d3.selectAll('.subjectHolder')
                .style('fill', style);
        })
        .on('mouseleave', function(d) {
            getConceptInstance(node.fact.subject).selected = false;
            console.log('out', conceptInstances[0]);
            d3.selectAll('.subjectHolder')
                .style('fill', style);
        });*/  //TODO enable in a future version - allows highlighting of re-occuring instances of this conceptInstance
    subjectHolder
        .append('text')
        .text(node.fact.subject.type);
    subjectHolder
        .append('text')
        .attr('y', '15')
        .text(node.fact.subject.value);

    var relationshipHolder = rowHolder
        .append('g')
        .attr('transform', 'translate(60, 0)')
        .attr('class', 'relationshipHolder holder');
    relationshipHolder
        .append('rect')
        .classed(getColor(node.factID), true);
    relationshipHolder
        .append('text')
        .attr('y', '7.5')
        .text(node.fact.relationship.type);

    var objectHolder = rowHolder
        .append('g')
        .attr('transform', 'translate(120, 0)')
        .attr('class', 'objectHolder holder');
    objectHolder
        .append('rect')
        .classed(getColor(node.factID), true);
    objectHolder
        .append('text')
        .text(node.fact.object.type);
    objectHolder
        .append('text')
        .attr('y', '15')
        .text(node.fact.object.value);

    if (parent) {
        nodeHolder.append('path')
            .attr('class', 'underPath');
        nodeHolder.append('path')
            .attr('class', 'overPath');
        nodeHolder.append('text')
            .attr('class', 'pathText');
    }

    if (node.rule) {
        addRuleBlock(node, nodeHolder, depth);
    }

    layoutNode(node, nodeHolder);
    updateColumnYPosition(depth);
    nodeHolder.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    })
}

function style(d) {
    return getConceptInstance(d.fact.subject).selected ? 'blue' : 'red';
}

function addRuleBlock(node, nodeHolder, depth) {

    /*nodeHolder.append('text')
        .text(node.rule.description);*/  //TODO add this in when it becomes available

    var ruleBlock = nodeHolder
        .append('g')
        .attr('id', 'ruleBlock')
        .classed('ruleHolder', true);

    ruleBlock.append('rect')
        .style('fill', 'white');

    node.rule.conditions.forEach(function(condition, i) {
        if (!condition.factID) //TODO remove this when analysis is fixed
            return;

        if (condition.expression) {
            ruleBlock.append('g')
                .text(condition.expression.text + condition.expression.value);
        } else {
            var rowHolder = ruleBlock.append('g')
                .attr('id', 'ruleText');
            rowHolder
                .append('rect')
                .attr('class', getColor(node.factID));
            rowHolder
                .append('text')
                .text(getReadableRuleText(node, condition));

            rowHolder.select('text').on('mouseenter', function() {
                d3.select(this).text(getRBLangRuleText(condition));
            });
            rowHolder.select('text').on('mouseleave', function() {
                d3.select(this).text(getReadableRuleText(node, condition));
            });
            var expanded = false;
            rowHolder.on('click', function() {
                if (!expanded) {
                    getFact(condition.factID, function(fact) {
                        if (fact === "") {
                            alert('dunno why this is empty');
                        }
                        else if (!expanded) {
                            expanded = true;
                            fact.targetIndex = ++i;
                            fact.targetSalience = condition.salience ? condition.salience : 100;
                            addNode(fact, depth + 1, node);
                            recalculate();
                        }
                    });
                }
            });
        }
    });
}

function getReadableRuleText(node, condition) {
    /*return (condition.subject === '%*' ? node.rule.bindings['S'] : node.rule.bindings[condition.subject]) + ' ' +
        condition.relationship + ' ' +
        (condition.object === '%*' ? node.rule.bindings['O'] : node.rule.bindings[condition.object]);*/
    return condition.subject + ' ' + condition.relationship + ' ' + condition.object;
}

function getRBLangRuleText(condition) {
    return condition.subject + ' ' + condition.relationship + ' ' + condition.object;
}



function getFact(factID, callback) {
    $.ajax({
        type: 'GET',
        url: yolandaUrl + "/analysis/evidence/" + factID,
        success: function (data, status) {
            console.log('evidence', data);
            callback(data);
        },
        error: function (data, status) {
            console.error(data, status);
            alert('error: ' + data + ' ' + status);
        }
    });
}

function getRule(ruleID, callback) {
    $.ajax({
        type: 'GET',
        url: yolandaUrl + "/analysis/ruleinfo/" + ruleID,
        success: function (data, status) {
            console.log('ruleinfo', data);
            callback(data);
        },
        error: function (data, status) {
            console.error(data, status);
            alert('error: ' + data + ' ' + status);
        }
    });
}

function getResults(resultsID, callback) {
    $.ajax({
        type: 'GET',
        url: yolandaUrl + "/analysis/resultset/" + resultsID,
        success: function (data, status) {
            console.log('resultset', data);
            callback(data);
        },
        error: function (data, status) {
            console.error(data, status);
            alert('error: ' + data + ' ' + status);
        }
    });
}
