var rootPattern = new RegExp(/^#[\/]?$/);
var workshopPattern = new RegExp(/^#\/workshop\/([^\/]+)[\/]?$/);
var modulePattern = new RegExp(/^#\/workshop\/([^\/]+)\/module\/([^\/]+)[\/]?$/);

var asciidoctor = Asciidoctor();

var config;
var content;

var flush = function() {
    content.html('<div style="text-align: center;font-size: 20px;"><i class="fa fa-spinner fa-pulse fa-fw"></i> &nbsp; Loading</div>');
};

var doRouting = function() {
    var route = location.hash;

    if(route == "") {
        route = location.hash = '/';
        return;
    }

    flush();

    var match;
    if(match = rootPattern.exec(route)) {
        if(config['defaultWorkshop'] != null) {
            location.hash = '/workshop/' + config['defaultWorkshop'];
            return;
        }
        $.get("/api/workshops", function (data) {
            $.get('/workshops.html', function(template) {
                content.html(template);
                new Vue({
                    el: '#workshops',
                    data: {
                        workshops: data
                    }
                })
            });
        });
    }

    if(match = workshopPattern.exec(route)) {
        var workshop = match[1];
        $.get("/api/workshops/" + workshop, function (data) {
            location.hash = '/workshop/' + workshop + "/module/" + data.sortedModules[0];
        });
    }

    if(match = modulePattern.exec(route)) {
        var workshop = match[1];
        var module = match[2];
        var prereqs = $("<div/>");

        $.get("/api/workshops/" + workshop + "/modules", function(modules){
            var data = {
                module: module,
                modules: modules
            };

            if (modules[module] !== null && modules[module].requires != null && modules[module].requires.length > 0) {
                prereqs.addClass("module-prerequisites").html("These modules are required before starting with the current module:");
                var list = $("<ul/>")
                prereqs.append(list);
                $.each(modules[module].requires, function(i, prereqModule) {
                    list.append("<li><a href='" + "#/workshop/" + workshop + "/module/" + prereqModule + "'>" + modules[prereqModule].name + "</a></li>");
                });
            }

            $.get("/api/workshops/" + workshop + "/env/" + module, function(env){
                $.get("/api/workshops/" + workshop + "/content/module/" + module, function(template) {
                    var tmpl = Liquid.parse(template);
                    var options = [
                        'icons=font',
                        'imagesdir=/api/workshops/' + workshop + '/content/assets/images',
                        'source-highlighter=highlightjs'
                    ];
                    data.content = asciidoctor.convert(tmpl.render(env.env), {attributes: options});
                    data.workshop = env.workshop;

                    data.doneModules = loadDoneModules();

                    for(var i = 0; i < env.workshop.sortedModules.length; i++) {
                        var name = env.workshop.sortedModules[i];
                        if(name == module) {
                            data.prevModule = env.workshop.sortedModules[i - 1];
                            data.nextModule = env.workshop.sortedModules[i + 1];
                        }
                    }

                    $.get('/module.html', function(template) {
                        content.html(template);
                        new Vue({
                            el: '#module',
                            data: data
                        });
                        // $('pre code').each(function(i, block) {
                        //     hljs.highlightBlock(block);
                        // });
                        $(".mark-as-done").click(function(){
                            doneModule(data.doneModules, module);
                        });
                    });
                });
            });
        });
    }
};

$(function(){
    content =  $("#content");
    $.get('/api/config', function(data){
        config = data;
        doRouting();
    });
});

$(window).on('hashchange', function() {
    doRouting();
});

var loadDoneModules = function() {
    var doneModules = Cookies.get("done-modules");

    if(typeof doneModules != 'undefined') {
        doneModules = doneModules.split(';');
    } else {
        doneModules = [];
    }

    return doneModules;
};

var doneModule = function(doneModules, module) {
    if(doneModules.indexOf(module) == -1) {
        doneModules.push(module);
    }
    Cookies.set("done-modules", doneModules.join(';'));
};