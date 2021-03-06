var assert = require('assert'),
    xmlparser = require('./../index.js'),
    express = require('express'),
    request = require('supertest'),
    itemList = {list: {item: ['item1', 'item2', 'item3']}},
    itemsXML = '<list><item>item1</item><item>item2</item><item>item3</item></list>';

describe('XmlParserMiddleware', function () {

    describe('#testMime', function () {

        var regexp = xmlparser.regexp;

        it('should detect common XML mime-types', function () {

            assert.equal(true, regexp.test('text/xml'));
            assert.equal(true, regexp.test('application/xml'));
            assert.equal(true, regexp.test('application/rss+xml'));
            assert.equal(true, regexp.test('application/atom+xml'));
            assert.equal(true, regexp.test('application/vnd.google-earth.kml+xml'));
            assert.equal(true, regexp.test('application/xhtml+xml'));

        });

        it('should not interfere with other body parsers', function () {

            assert.equal(false, regexp.test('application/json'));
            assert.equal(false, regexp.test('application/x-www-form-urlencoded'));
            assert.equal(false, regexp.test('multipart/form-data'));

        });

    });

    describe('#testMiddleware', function () {

        var app = express();

        app.use(xmlparser());
        app.get('/', function (req, res) {
            res.json(req.body);
        });
        app.post('/', function(req, res) {
            res.json(req.body);
        });
      
        it('should not run if there is no request-body', function (done) {
          request(app)
            .get('/')
            .expect(200, '{}', done);
        });
        
        it('should not run if there no content-type header', function (done) {
          request(app)
            .post('/')
            .send(itemsXML)
            .expect(200, '{}', done);
        });
      
        it('should throw 411 on null request', function (done) {
            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .expect(411, done)
            ;
        });

        it('should throw 411 on empty request body', function (done) {
            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .send('   ')
              .expect(411, done)
            ;
        });

        it('should parse xml body', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/vendor-spec+xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });
        });
        
        it('should throw 400 on invalid xml body', function (done) {

            request(app)
              .post('/')
              .set('Content-Type', 'application/vendor-spec+xml')
              .send('<xml>this is invalid')
              .expect(400, done)
            ;
        });
        
    });
  
    describe('#testOtherBodyParser', function () {
      
        var app = express();
        app.use(function fakeMiddleware(req, res, next) {
          // simulate previous bodyparser by setting req._body = true
          req._body = true;
          req.body = 'fake data';
          next();
        });
        app.use(xmlparser());
        app.post('/', function(req, res) {
          res.json(req.body);
        });
      
        it('should not parse body if other bodyparser ran before', function (done) {
          request(app)
            .post('/')
            .set('Content-Type', 'application/xml')
            .send(itemsXML)
            .expect(200, '"fake data"', done);
        });
      
    });
  
    describe('#testCustomRegExp', function () {

        // get a fresh export instead of a reference to `xmlbodyparser`
        delete require.cache[require.resolve('../index.js')];

        var middleware = require('../index.js');
        var app = express();

        middleware.regexp = /custom\/mime/i;

        app.use(middleware);

        app.post('/', function(req, res) {
            res.json(req.body);
        });

        it('should permit overloading mime-type regular expression', function () {

            assert.notEqual(middleware, xmlparser.regexp);
            assert.equal(true, middleware.regexp.test('custom/mime'));
            assert.equal(false, middleware.regexp.test('application/xml'));

        });

        it('should ignore non-matching content-types', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual({}, res.body);
              });

        });

        it('should parse matching content-types', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'custom/mime')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });

        });

    });

    describe('#testRouteMiddleware', function () {

        var app = express();

        app.post('/', function(req, res) {
            res.json(req.body);
        });
        app.post('/xml', xmlparser(), function(req, res) {
            res.json(req.body);
        });

        it('should not act as an app middleware', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual({}, res.body);
              });

        });

        it('should parse route xml request', function () {

            request(app)
              .post('/xml')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });

        });

    });

});

