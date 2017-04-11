const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const fse = require('fs-extra-promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

request({
    uri: 'https://www.rethinkdb.com/api/javascript/',
    transform: function (body) {
        return cheerio.load(body);
    }
}).then($ => {

    // ... I hate it
    // ... but I love RethinkDB

    $('section.byline').first().remove();
    $('section.docs-sidebar-left').first().remove();
    $('nav.mobile-menu.push-menu-right').first().remove();
    $('div.site-container').children('ul').first().remove();
    $('section.api-footer').remove();
    $('footer').remove();
    $('div.infobox.infobox-info').remove();
    $('nav.site-nav').remove();

    const APIContent = $('.api-content.docs-article');

    const APISections = APIContent.children('.api-sections');

    const APISection = APISections.children('.api-section');


    const Sections = [];

    APISection.each(function (index) {
        const element = $(this);
        const SectionHeading = element.children('h1').first();
        $(`<a class='api-anchor' name='${encodeURIComponent(SectionHeading.text())}'></a>`).insertBefore(SectionHeading);
        Sections.push({
            path: 'index.html#' + encodeURIComponent(SectionHeading.text()),
            name: SectionHeading.text(),
            type: 'Section'
        });
    });

    $('a').each(function () {
        const a = $(this);
        if (a.text() === "Read more about this command →") {
            a.parent().remove();
            a.remove();
        }
        if (a.attr('href')) {
            a.attr('href', `https://www.rethinkdb.com/api/javascript/${a.attr('href')}`);
            if (a.text() !== "Read more about this command →" && a.parent().prop('tagName').toLowerCase() === "h2") {
                //console.log(a.text());
            }
        }
    });

    const SQLS = [];

    fse.ensureDirAsync('./temp').then(() => {
        fs.writeFileSync('./temp/index.html', $.html());
        const Article = [];
        $api = $('.api-sections');
        $('h2', $api).each(function (i, command_header) {
            var $header, $link, $wrapper, command;
            $header = $(command_header);
            $wrapper = $("<article class='api-command'></article>");
            //$header.nextUntil("h2").andSelf().wrapAll($wrapper);
            $link = $('a', $header);
            if ($link.attr('href')) {
                command = $('a', $header).attr('href').split('/').filter(function (el) {
                    return el.length > 0;
                }).slice(-1)[0];
                Article.push({
                    name: command,
                    path: 'index.html#' + command,
                    type: "Command"
                });
            }
        });
        for (let i = 0; i < Article.length; i++) {
            SQLS.push(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${Article[i].name}', '${Article[i].type}', '${Article[i].path}');`);
        }
        for (let i = 0; i < Sections.length; i++) {
            SQLS.push(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${Sections[i].name}', '${Sections[i].type}', '${Sections[i].path}');`);
        }
        return fse.removeAsync('./build');
    })
        .then(() => {
            return fse.ensureDirAsync('./build/RethinkDBJS.docset/Contents/Resources/Documents');
        })
        .then(() => {
            return fse.copyAsync('./temp', './build/RethinkDBJS.docset/Contents/Resources/Documents');
        })
        .then(() => {
            return fse.copyAsync('./icon.png', './build/RethinkDBJS.docset/icon.png');
        })
        .then(() => {
            return fse.copyAsync('./Info.plist', './build/RethinkDBJS.docset/Contents/Info.plist');
        })
        .then(() => {
            const db = new sqlite3.Database('./build/RethinkDBJS.docset/Contents/Resources/docSet.dsidx');
            db.run('CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);', function () {
                db.run('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);', function () {
                    for (let i = 0; i < SQLS.length; i++) {
                        db.run(SQLS[i]);
                    }
                    db.close();
                    console.log("Finished");
                });
            });

        });

}).catch(e => console.error(new Error(e)));


fse.ensureDirAsync('./temp/assets/css/').then(() => {
    return fse.ensureDirAsync('./temp/assets/js/waypoints/shortcuts/');
}).then(() => {
    return fse.ensureDirAsync('./temp/assets/images');
}).then(() => {
    request('https://www.rethinkdb.com/assets/css/styles-02.css').then(style => {
        fs.writeFileSync('./temp/assets/css/styles-02.css', style);
    });
    request('https://www.rethinkdb.com/assets/css/jekyll-github.css').then(style => {
        fs.writeFileSync('./temp/assets/css/jekyll-github.css', style);
    });
    request('https://www.rethinkdb.com/assets/js/jquery-2.1.3.min.js').then(style => {
        fs.writeFileSync('./temp/assets/js/jquery-2.1.3.min.js', style);
    });
    request('https://www.rethinkdb.com/assets/js/waypoints/jquery.waypoints.min.js').then(style => {
        fs.writeFileSync('./temp/assets/js/waypoints/jquery.waypoints.min.js', style);
    });
    request('https://www.rethinkdb.com/assets/js/waypoints/shortcuts/sticky.min.js').then(style => {
        fs.writeFileSync('./temp/assets/js/waypoints/shortcuts/sticky.min.js', style);
    });
    request('https://www.rethinkdb.com/assets/js/api.js').then(style => {
        fs.writeFileSync('./temp/assets/js/api.js', style);
    });
    request('https://www.rethinkdb.com/assets/js/js.cookie.js').then(style => {
        fs.writeFileSync('./temp/assets/js/js.cookie.js', style);
    });
    request('https://www.rethinkdb.com/assets/js/site.js').then(style => {
        fs.writeFileSync('./temp/assets/js/site.js', style);
    });
    request('https://www.rethinkdb.com/assets/images/logo.png').pipe(fs.createWriteStream('./temp/assets/images/logo.png'));
});

/**
 * @return {boolean}
 */
Array.prototype.Contains = function (att, val) {
    for (let i = 0; i < this.length; i++) {
        if (this[i][att] === val) {
            return true;
        }
    }
    return false;
};