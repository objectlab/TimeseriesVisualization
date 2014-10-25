/**
 * Created by ernst96 on 10/23/14.
 */
$.browser.chrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());

// data generator
var refreshTime = 2500, // ms to fire refresh
    update = false, // set true to simulate event feed
    updateTimer,
    t = 1297110663, // start time (seconds since epoch)
    ts = 70, // totals start number
    cs = 70, // count base value
    ss = 1, // stale base value
    _DATA = [],

// chart sample configs
    lBarCount = 60, // number of life bars
    hBarCount = 24, // number of 1-hour history bars
    h2BarCount = 24, // number of 2-hour history bars
    totalCount = lBarCount + hBarCount + h2BarCount,

// static dimensions
    tcp = 12, // padding on top of totals chart (spacing for labels)
    th = 50, // totals chart height
    ch = 50, // chart height
    bp = $.browser.chrome ? 1 : 2, // bar padding compensation
    vLineComp = $.browser.chrome ? 1 : 2, // vertical line compensation
    tbh = 3, // totals block height
    labelw = 200,

    bw = 6, // bar width
    cp, //  padding around and in between charts
    cw, // widt of the chart
    svgw, // width of svg element

// positioning scales
    xScale,
    yScale,
    ytScale,

// totals block color scale
    tColorScale = d3.scale.threshold()
        .domain([50, 75])
        .range(["#7ED321", "#F5C323", "#DA581C"]),

// count bar color scale
    cColorScale = d3.scale.threshold()
        .domain([50, 75])
        .range(["#7ED321", "#F5C323", "#DA581C"]),

// stale bar color scale
    sColorScale = d3.scale.threshold()
        .domain([50, 75])
        .range(["#528314", "#B4811B", "#A7411E"]),

// date stamp formatter
    dateFmt = d3.time.format("%d-%b-%Y %X"),

// feed/status configurations
    config = [

        {
            feedNm: 'Quorra',
            dspId: 1,
            statuses: [
                {
                    statusId: 1,
                    statusNm: 'New'
                }, {
                    statusId: 2,
                    statusNm: 'Converting'
                }, {
                    statusId: 3,
                    statusNm: 'Packaging'
                }, {
                    statusId: 4,
                    statusNm: 'Packaged'
                }, {
                    statusId: 5,
                    statusNm: 'Enqueued'
                }
            ]
        }, {
            feedNm: 'Dillinger',
            dspId: 2,
            statuses: [
                {
                    statusId: 1,
                    statusNm: 'New'
                }, {
                    statusId: 2,
                    statusNm: 'Converting'
                }, {
                    statusId: 3,
                    statusNm: 'Packaging'
                }, {
                    statusId: 4,
                    statusNm: 'Packaged'
                }, {
                    statusId: 5,
                    statusNm: 'Enqueued'
                }, {
                    statusId: 7,
                    statusNm: 'Delivered'
                }, {
                    statusId: 8,
                    statusNm: 'Hold'
                }, {
                    statusId: 9,
                    statusNm: 'Blocked'
                }
            ]
        }, {
            feedNm: 'Zuse',
            dspId: 3,
            statuses: [
                {
                    statusId: 3,
                    statusNm: 'Packaging'
                }, {
                    statusId: 4,
                    statusNm: 'Packaged'
                }, {
                    statusId: 5,
                    statusNm: 'Enqueued'
                }, {
                    statusId: 6,
                    statusNm: 'Delivering'
                }, {
                    statusId: 7,
                    statusNm: 'Delivered'
                }, {
                    statusId: 8,
                    statusNm: 'Hold'
                }, {
                    statusId: 9,
                    statusNm: 'Blocked'
                }
            ]
        }, {
            feedNm: 'Shaddix',
            dspId: 4,
            statuses: [
                {
                    statusId: 1,
                    statusNm: 'New'
                }, {
                    statusId: 2,
                    statusNm: 'Converting'
                }, {
                    statusId: 3,
                    statusNm: 'Packaging'
                }, {
                    statusId: 4,
                    statusNm: 'Packaged'
                }, {
                    statusId: 5,
                    statusNm: 'Enqueued'
                }, {
                    statusId: 6,
                    statusNm: 'Delivering'
                }, {
                    statusId: 7,
                    statusNm: 'Delivered'
                }
            ]
        }
    ];


/**
 *  Draw the visualization
 **/
function drawViz() {

    // calibrate dimensions
    totalCount = lBarCount + hBarCount + h2BarCount;
    cp = bw;
    cw = bw * totalCount + cp * 4;
    svgw = cw + labelw;


    xScale = d3.scale.linear()
        .domain([0, 1])
        .rangeRound([0, bw]);

    yScale = d3.scale.linear()
        .rangeRound([0, ch - cp]);

    ytScale = d3.scale.linear()
        .rangeRound([0, th - tcp]);

    // remove all previosuly drawn feeds
    d3.select("#viz").selectAll(".feed").remove();

    // add an SVG element for each feed
    var feed = d3.select("#viz").selectAll(".feed")
        .data(_DATA, function (d) {
            return d.dspId;
        })
        .enter()
        .append("div")
        .attr("class", "feed")
        .append("svg")
        .attr("width", svgw)
        .attr("height", function (d) {
            return (d.statuses.length * ch) + th + cp + tcp;
        })
        .call(drawIntervalGrid)
        .call(drawFeedLabels);


    // add the totals chart
    feed.append("g")
        .attr("class", "totals")
        .attr("transform", function (d, i) {
            return "translate(" + cp + "," + tcp + ")";
        })
        .each(drawTotals)
        .call(drawTotalsLabels);

    // add the status charts
    var statusGrp = feed.selectAll(".status")
        .data(function (d) {
            return d.statuses;
        });

    statusGrp.enter().append("g")
        .attr("class", "status")
        .attr("transform", function (d, i) {
            return "translate(" + cp + "," + ( i * ch + th + tcp) + ")";
        })
        .each(drawStatus)
        .call(drawStatusLabels);

    // add a mouse event bar for each timestamp
    // these are initially hidden and are  displayed on a mouse over; hidden on mouse out
    feed.append("g")
        .attr("class", "mouseeventbars")
        .attr("transform", function (d, i) {
            return "translate(" + cp + "," + tcp + ")";
        })
        .each(drawMouseEventBars);


    update = true;

}


/**
 * Draw status labels
 */
function drawStatusLabels() {

    var g = this,
        x = cw + 50,
        y = ch / 2 + 2,
    // grab the last record from the dataset
        count = function (d, i) {
            return d.values[d.values.length - 1].count;
        },
        stale = function (d, i) {
            return d.values[d.values.length - 1].stale;
        },
        cc = function (d, i) {
            return cColorScale(d.values[d.values.length - 1].count);
        },
        sc = function (d, i) {
            return sColorScale(d.values[d.values.length - 1].count);
        };

    g.append("text")
        .attr("class", "status-label")
        .attr("text-anchor", "start")
        .attr("x", x)
        .attr("y", y)
        .attr("dx", ".5em")
        .attr("dy", "-.2em")
        .attr("fill", cc)
        .text(function (d, i) {
            return d.name;
        });

    g.append("text")
        .attr("class", "count-label")
        .attr("text-anchor", "end")
        .attr("x", x)
        .attr("y", y)
        .attr("fill", cc)
        .text(count);

    g.append("text")
        .attr("class", "stale-label")
        .attr("text-anchor", "end")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", "1em")
        .attr("fill", sc)
        .text(stale);

    g.append("text")
        .attr("class", "stale-threshold-label")
        .attr("text-anchor", "start")
        .attr("x", x)
        .attr("y", y)
        .attr("dx", ".5em")
        .attr("dy", "1.45em")
        .attr("fill", sc)
        .text("32m +");

}


/**
 * Draw totals labels
 **/
function drawTotalsLabels() {

    var g = this,
        x = cw + 50,
        y = th / 2 + 6,
        c = function (d, i) {
            return tColorScale(d.totals[d.totals.length - 1].count);
        };

    g.append("text")
        .attr("class", "totals-label")
        .attr("text-anchor", "start")
        .attr("x", x)
        .attr("y", y)
        .attr("dx", ".5em")
        .attr("dy", ".5em")
        .attr("fill", c)
        .text("Total");

    g.append("text")
        .attr("class", "totals-count-label")
        .attr("text-anchor", "end")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", ".4em")
        .attr("fill", c)
        .text(function (d, i) {
            return d.totals[d.totals.length - 1].count;
        });

}


/**
 * Draw feed labels
 **/
function drawFeedLabels() {

    var g = this;


    g.append("text")
        .attr("class", "feed-name-label")
        .attr("text-anchor", "start")
        .attr("x", cw + 10)
        .attr("y", 15)
        .text(function (d) {
            return d.feedNm;
        });

    g.append("text")
        .attr("class", "feed-timestamp-label")
        .attr("text-anchor", "start")
        .attr("x", cw + 10)
        .attr("y", 15)
        .attr("dy", "1.3em")
        // for now just take the current timestamp
        .text(dateFmt(new Date()));

}


/**
 * Draw the interval grid lines and labels
 */
function drawIntervalGrid(d) {

    var svg = this,
        y2 = function (d) {
            return (d.statuses.length * ch) + th + tcp + cp;
        },
        x1a = cp - bw / 2 - vLineComp,
        x1b = bw * h2BarCount + bw / 2 - vLineComp + cp,
        x1c = bw * (h2BarCount + hBarCount) + bw / 2 - vLineComp + cp,
        x1d = cw - cp / 2 - vLineComp,
        l1x = x1b / 2,
        l2x = x1c - (x1c - x1b) / 2,
        l3x = x1d - (x1d - x1c) / 2;

    // add vertical interval lines
    svg.append("line")
        .attr("stroke-dasharray", "1,1")
        .attr("x1", x1a)
        .attr("y1", 0)
        .attr("x2", x1a)
        .attr("y2", y2);

    svg.append("line")
        .attr("stroke-dasharray", "1,1")
        .attr("x1", x1b)
        .attr("y1", 0)
        .attr("x2", x1b)
        .attr("y2", y2);

    svg.append("line")
        .attr("stroke-dasharray", "1,1")
        .attr("x1", x1c)
        .attr("y1", 0)
        .attr("x2", x1c)
        .attr("y2", y2);

    svg.append("line")
        .attr("stroke-dasharray", "1,1")
        .attr("x1", x1d)
        .attr("y1", 0)
        .attr("x2", x1d)
        .attr("y2", y2);

    // horizontal lines
    svg.append("line")
        .attr("x1", cp)
        .attr("y1", tcp / 2)
        .attr("x2", x1b - cp / 2)
        .attr("y2", tcp / 2);

    svg.append("line")
        .attr("x1", x1b + cp / 2)
        .attr("y1", tcp / 2)
        .attr("x2", x1c - cp / 2)
        .attr("y2", tcp / 2);

    svg.append("line")
        .attr("x1", x1c + cp / 2)
        .attr("y1", tcp / 2)
        .attr("x2", x1d - cp / 2)
        .attr("y2", tcp / 2);

    // create txt bg recangles
    svg.append("rect")
        .attr("class", "label-bg")
        .attr("x", l1x - 40)
        .attr("y", 0)
        .attr("width", 80)
        .attr("height", tcp);

    svg.append("rect")
        .attr("class", "label-bg")
        .attr("x", l2x - 40)
        .attr("y", 0)
        .attr("width", 80)
        .attr("height", tcp);

    svg.append("rect")
        .attr("class", "label-bg")
        .attr("x", l3x - 40)
        .attr("y", 0)
        .attr("width", 80)
        .attr("height", tcp);


    // add interval labels
    svg.append("text")
        .attr("class", "int-label")
        .attr("text-anchor", "middle")
        .attr("x", l1x)
        .attr("y", tcp / 2)
        .attr("dy", ".35em")
        .text("Prior " + h2BarCount + "h (2h)");

    svg.append("text")
        .attr("class", "int-label")
        .attr("text-anchor", "middle")
        .attr("x", l2x)
        .attr("y", tcp / 2)
        .attr("dy", ".35em")
        .text("Past " + hBarCount + "(1h)");

    svg.append("text")
        .attr("class", "int-label")
        .attr("text-anchor", "middle")
        .attr("x", l3x)
        .attr("y", tcp / 2)
        .attr("dy", ".3em")
        .text("Past " + lBarCount + "m (1m)");

}

/**
 * Draw a totals block chart
 */
function drawTotals(feedData) {

    var totalsGrp = d3.select(this);

    // calibrate the y domain
    ytScale.domain([d3.min(feedData.totals, function (d) {
        return d.count;
    }), d3.max(feedData.totals, function (d) {
        return d.count;
    })]);

    totalsGrp.selectAll('.block')
        .data(feedData.totals, function (d) {
            return d.time;
        })
        .enter().append("rect")
        .attr("class", "block")
        .style("fill", function (d) {
            return tColorScale(d.count);
        })
        .attr("y", function (d) {
            return th - ytScale(d.count);
        })
        .attr("width", bw - bp)
        .attr("height", tbh)
        .call(xpos);

}

/**
 * Draw a status bar charts
 */
function drawStatus(statusData) {

    var statusGrp = d3.select(this);

    // calibrate the y-scale domain
    yScale.domain([0, d3.max(statusData.values, function (d) {
        return d.count;
    })]);


    // add count bars for each value
    statusGrp.selectAll(".c-bar")
        .data(statusData.values, function (d) {
            return d.time;
        })
        .enter().append("rect")
        .attr("class", "c-bar")
        .style("fill", function (d) {
            return cColorScale(d.count);
        })
        .attr("y", function (d) {
            return ch - yScale(d.count) - .5;
        })
        .attr("width", bw - bp)
        .attr("height", function (d) {
            return yScale(d.count);
        })
        .call(xpos);

    // add stale bars for each value
    statusGrp.selectAll(".s-bar")
        .data(statusData.values, function (d) {
            return d.time;
        })
        .enter().append("rect")
        .attr("class", "s-bar")
        .style("fill", function (d) {
            return sColorScale(d.count);
        })
        .attr("y", function (d) {
            return ch - yScale(d.stale) - .5;
        })
        .attr("width", bw - bp)
        .attr("height", function (d) {
            return yScale(d.stale);
        })
        .call(xpos);

}

/**
 * Draw a mouse event bar chart
 */
function drawMouseEventBars(feedData) {

    var barsGrp = d3.select(this),
        h = th + feedData.statuses.length * ch;

    barsGrp.selectAll('.bar')
        .data(feedData.totals)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("width", bw - bp)
        .attr("height", h)
        .on('mouseover', onMouseOver)
        .on('mouseout', onMouseOut)
        .call(xpos);
}

/**
 * Mouse-over event handler
 */
function onMouseOver(d, i) {

    var feed = d3.select(this.parentNode.parentNode),
        sg = feed.selectAll(".status"),
        tg = feed.select(".totals"),
        cc = function (d) {
            return cColorScale(d.values[i].count);
        },
        sc = function (d) {
            return sColorScale(d.values[i].count);
        },
        tc = function (d) {
            return tColorScale(d.totals[i].count);
        };

    // stop the simulated update
    update = false;
    // highlight the bar
    d3.select(this).classed("highlight", true);

    // update lables
    sg.select(".count-label")
        .attr("fill", cc)
        .text(function (d) {
            return d.values[i].count;
        });

    sg.select(".stale-label")
        .attr("fill", sc)
        .text(function (d) {
            return d.values[i].stale;
        });

    sg.select(".status-label")
        .attr("fill", cc);

    sg.select(".stale-threshold-label")
        .attr("fill", sc);

    tg.select(".totals-label")
        .attr("fill", tc);

    tg.select(".totals-count-label")
        .attr("fill", tc)
        .text(function (d) {
            return d.totals[i].count;
        });

    feed.select(".feed-timestamp-label")
        .text(function (d) {
            return d.totals[i].date;
        });

}

/**
 * Mouse-out event handler
 */
function onMouseOut(d) {
    d3.select(this).classed("highlight", false);
    update = true;
}

/**
 * Update the visualization
 */
function updateViz() {

    var feed = d3.selectAll(".feed")
        .data(_DATA, function (d) {
            return d.dspId;
        });

    feed.call(updateFeedLabels);

    feed.select(".totals")
        .each(updateTotals)
        .call(updateTotalslabels);

    feed.selectAll(".status")
        .data(function (d) {
            return d.statuses;
        })
        .each(updateStatus)
        .call(updateStatusLabels);

}

/**
 * Update feed labels
 */
function updateFeedLabels() {

    var g = this;

    g.select(".feed-timestamp-label")
        .text(this.datum().timestamp);

}

/**
 * Update totals block chart
 */
function updateTotals(feedData) {

    var totalsGrp = d3.select(this);

    // calibrate the y domain
    ytScale.domain([d3.min(feedData.totals, function (d) {
        return d.count;
    }), d3.max(feedData.totals, function (d) {
        return d.count;
    })]);

    totalsGrp.selectAll('.block')
        .data(feedData.totals)
        .style("fill", function (d) {
            return tColorScale(d.count);
        })
        .attr("y", function (d) {
            return th - ytScale(d.count);
        });

}

/**
 * Update the totals labels
 */
function updateTotalslabels() {

    var g = this,
        c = function (d, i) {
            return tColorScale(d.totals[d.totals.length - 1].count);
        };

    g.select(".totals-label")
        .attr("fill", c);

    g.select(".totals-count-label")
        .attr("fill", c)
        .text(function (d, i) {
            return d.totals[d.totals.length - 1].count;
        });

}


/**
 * Update status bar chart
 */
function updateStatus(status) {

    var statusGrp = d3.select(this);

    // re-calibrate the y domain
    yScale.domain([0, d3.max(status.values, function (d) {
        return d.count;
    })]);


    // update count bars
    statusGrp.selectAll('.c-bar')
        .data(status.values)
        .style("fill", function (d) {
            return cColorScale(d.count);
        })
        .attr("y", function (d) {
            return ch - yScale(d.count) - .5;
        })
        .attr("height", function (d) {
            return yScale(d.count);
        });

    // update stale bars
    statusGrp.selectAll(".s-bar")
        .data(status.values)
        .style("fill", function (d) {
            return sColorScale(d.count);
        })
        .attr("y", function (d) {
            return ch - yScale(d.stale) - .5;
        })
        .attr("height", function (d) {
            return yScale(d.stale);
        });

}

/**
 * Update status labels
 */
function updateStatusLabels() {

    var g = this,
    // grab the last record from the data-set
        count = function (d, i) {
            return d.values[d.values.length - 1].count;
        },
        stale = function (d, i) {
            return d.values[d.values.length - 1].stale;
        },
        cc = function (d, i) {
            return cColorScale(d.values[d.values.length - 1].count);
        },
        sc = function (d, i) {
            return sColorScale(d.values[d.values.length - 1].count);
        };

    g.select(".status-label")
        .attr("fill", cc);

    g.select(".stale-threshold-label")
        .attr("fill", sc);

    g.select(".count-label")
        .attr("fill", cc)
        .text(count);

    g.select(".stale-label")
        .attr("fill", sc)
        .text(stale);

}

/**
 * Position bar
 */
function xpos(d) {
    this.attr("x",
        function (d, i) {
            // add spacing between time interval groupings
            var padd = 0;

            if (i > h2BarCount - 1) {
                padd = bw;
            }
            if (i > h2BarCount + hBarCount - 2) {
                padd = bw * 2;
            }
            return xScale(i) - .5 + padd;
        }
    );
}

/**
 * Create a random data set with trending values
 */
function makeData(count) {

    // reset
    _DATA = [];

    config.forEach(
        function (f, idx, array) {

            var fData = {
                dspId: f.dspId,
                feedNm: f.feedNm,
                timestamp: dateFmt(new Date()),
                totals: d3.range(count).map(nextTotal),
                statuses: []
            };

            // create status dat for the feed
            f.statuses.forEach(
                function (s) {

                    var sData = {
                        key: s.statusId,
                        name: s.statusNm,
                        values: d3.range(count).map(nextValue)
                    };

                    fData.statuses.push(sData);

                }
            );

            // then add the feed data
            _DATA.push(fData);
        }
    );

}

/**
 * Create a new total data item
 */
function nextTotal() {
    return {
        time: t++,
        date: dateFmt(new Date()),
        count: ts = ~~Math.max(10, Math.min(90, ts + 5 * (Math.random() - .5)))
    };
}

/**
 * Create a new status data item
 */
function nextValue() {
    return {
        time: t++,
        count: cs = ~~Math.max(10, Math.min(90, cs + 6 * (Math.random() - .45))),
        stale: ss = ~~Math.max(0, Math.min(20, ss + 4 * (Math.random() - .45)))
    };
}


/**
 * Initiate the simulated update
 */
function startUpdate() {

    updateTimer = setInterval(function () {

        if (update) {

            _DATA.forEach(
                function (f, idx, array) {

                    var nt = nextTotal();

                    f.timestamp = dateFmt(new Date());

                    f.totals.shift();
                    f.totals.push(nt);

                    // create status data for the feed

                    f.statuses.forEach(
                        function (s) {

                            var nv = nextValue();

                            s.values.shift();
                            s.values.push(nv);
                        }
                    );

                }
            );

            updateViz();

        }

    }, refreshTime);

}


// init ui controls
$(function () {

    $("#update-speed-slider").slider({
        min: 100,
        max: 5000,
        step: 100,
        value: refreshTime,
        change: function (event, ui) {
            if (update) {
                refreshTime = ui.value;
                $('#slider-value').html(refreshTime);
                clearInterval(updateTimer);
                startUpdate();
            }
        }
    });

    $("#bar-width-spinner").spinner({
        min: 4,
        max: 16,
        step: 2,
        numberFormat: "C",
        stop: function (event, ui) {
            var v = parseInt(this.value);
            if (v) {
                bw = v;
                clearInterval(updateTimer);
                drawViz();
                startUpdate();
            }

        }
    });

    $(".count-spinner").spinner({
        step: 5,
        min: 20,
        max: 150
    });

    $("#refresh-button")
        .button()
        .click(function (event) {

            lBarCount = parseInt($("#1m-count-spinner").val());
            hBarCount = parseInt($("#1h-count-spinner").val());
            h2BarCount = parseInt($("#2h-count-spinner").val());

            totalCount = lBarCount + hBarCount + h2BarCount;


            makeData(totalCount);
            clearInterval(updateTimer);
            drawViz();
            startUpdate();

        })


});


// generate some data
makeData(totalCount);

// draw the inital visualization
drawViz();

// initialte the update
startUpdate();