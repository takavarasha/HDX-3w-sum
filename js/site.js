//configuration object

var config = {
    title:"Somalia Cash 3W",
    description:"CASH Sector Who is doing What, Where in Somalia Famine Response",
    //data:"https://proxy.hxlstandard.org/data.json?url=https://docs.google.com/spreadsheets/d/138BdIVkk0VNTXKaaHsCdTrfaxjWlui8rXgnZ0vtQj4g/edit?usp=sharing&strip-headers=on",
    data:"https://proxy.hxlstandard.org/data.json?url=https://docs.google.com/spreadsheets/d/1_njbYAMLRqmBRR7e1fKMgKXPsMn7RGmZzdvKAq8RH2U/edit?usp=sharing&strip-headers=on",
    whoFieldName:"#org",
    whatFieldName:"#sector",
    whereFieldName:"#adm2+code",
    sum: true,
    sumField:"#targeted",
    geo:"data/Somalia_District_Polygon.json",
    joinAttribute:"DIS_CODE",
    nameAttribute:"DIST_NAME",
    color:"#03a9f4"
};

//function to generate the 3W component
//data is the whole 3W Excel data set
//geom is geojson file

function generate3WComponent(config,data,geom){
    
    var lookup = genLookup(geom,config);
    
    $('#title').html(config.title);
    $('#description').html(config.description);

    var whoChart = dc.rowChart('#hdx-3W-who');
    var whatChart = dc.rowChart('#hdx-3W-what');
    var whereChart = dc.leafletChoroplethChart('#hdx-3W-where');

    var cf = crossfilter(data);

    var whoDimension = cf.dimension(function(d){ return d[config.whoFieldName]; });
    var whatDimension = cf.dimension(function(d){ return d[config.whatFieldName]; });
    var whereDimension = cf.dimension(function(d){ return d[config.whereFieldName]; });
    if(config.sum){
        var whoGroup = whoDimension.group().reduceSum(function(d){ return parseInt(d[config.sumField]); });
        var whatGroup = whatDimension.group().reduceSum(function(d){ return parseInt(d[config.sumField]); });
        var whereGroup = whereDimension.group().reduceSum(function(d){ return parseInt(d[config.sumField]); });        
    } else {
        var whoGroup = whoDimension.group();
        var whatGroup = whatDimension.group();
        var whereGroup = whereDimension.group(); 
    }

    var all = cf.groupAll();

    whoChart.width($('#hxd-3W-who').width()).height(400)
            .dimension(whoDimension)
            .group(whoGroup)
            .elasticX(true)
            .data(function(group) {
                return group.top(15);
            })
            .labelOffsetY(13)
            .colors([config.color])
            .colorAccessor(function(d, i){return 0;})
            .xAxis().ticks(5);

    whatChart.width($('#hxd-3W-what').width()).height(400)
            .dimension(whatDimension)
            .group(whatGroup)
            .elasticX(true)
            .data(function(group) {
                return group.top(15);
            })
            .labelOffsetY(13)
            .colors([config.color])
            .colorAccessor(function(d, i){return 0;})
            .xAxis().ticks(5);

    dc.dataCount('#count-info')
            .dimension(cf)
            .group(all);

    whereChart.width($('#hxd-3W-where').width()).height(360)
            .dimension(whereDimension)
            .group(whereGroup)
            .center([0,0])
            .zoom(0)    
            .geojson(geom)
            .colors(['#CCCCCC', config.color])
            .colorDomain([0, 1])
            .colorAccessor(function (d) {
                if(d>0){
                    return 1;
                } else {
                    return 0;
                }
            })           
            .featureKeyAccessor(function(feature){
                return feature.properties[config.joinAttribute];
            }).popup(function(d){
                return lookup[d.key];
            })
            .renderPopup(true);

    dc.renderAll();
    
    var map = whereChart.map();

    zoomToGeom(geom);

    if(config.sum){
        var axisText = config.sumField.substr(1);
    } else {
        var axisText = 'Activities';
    }
    
    

    var g = d3.selectAll('#hdx-3W-who').select('svg').append('g');
    
    g.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', $('#hdx-3W-who').width()/2)
        .attr('y', 400)
        .text(axisText);

    var g = d3.selectAll('#hdx-3W-what').select('svg').append('g');
    
    g.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', $('#hdx-3W-what').width()/2)
        .attr('y', 400)
        .text(axisText);

    function zoomToGeom(geom){
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
    }
    
    function genLookup(geojson,config){
        var lookup = {};
        geojson.features.forEach(function(e){
            lookup[e.properties[config.joinAttribute]] = String(e.properties[config.nameAttribute]);
        });
        return lookup;
    }
}

function hxlProxyToJSON(input,headers){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

//load 3W data

var dataCall = $.ajax({ 
    type: 'GET', 
    url: config.data, 
    dataType: 'json',
});

//load geometry

var geomCall = $.ajax({ 
    type: 'GET', 
    url: config.geo, 
    dataType: 'json',
});

//when both ready construct 3W

$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
    var data = hxlProxyToJSON(dataArgs[0]);
    var geom = geomArgs[0];
    geom.features.forEach(function(e){
        e.properties[config.joinAttribute] = String(e.properties[config.joinAttribute]); 
    });
    generate3WComponent(config,data,geom);
});
