/* eslint-env mocha */

import multerS3, { AUTO_CONTENT_TYPE } from "../index.js";

import fs from "fs";
import path from "path";
import extend from "xtend";
import assert from "assert";
import multer from "multer";
import stream from "stream";
import FormData from "form-data";
import onFinished from "on-finished";
import mockS3 from "./util/mock-s3.cjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var VALID_OPTIONS = {
  bucket: "string",
};

var INVALID_OPTIONS = [
  ["numeric key", { key: 1337 }],
  ["string key", { key: "string" }],
  ["numeric bucket", { bucket: 1337 }],
  ["numeric contentType", { contentType: 1337 }],
];

function submitForm(multer, form, cb) {
  form.getLength(function (err, length) {
    if (err) return cb(err);

    var req = new stream.PassThrough();

    req.complete = false;
    form.once("end", function () {
      req.complete = true;
    });

    form.pipe(req);
    req.headers = {
      "content-type": "multipart/form-data; boundary=" + form.getBoundary(),
      "content-length": length,
    };

    multer(req, null, function (err) {
      onFinished(req, function () {
        cb(err, req);
      });
    });
  });
}

describe("Multer S3", function () {
  it("is exposed as a function", function () {
    assert.equal(typeof multerS3, "function");
  });

  INVALID_OPTIONS.forEach(function (testCase) {
    it("throws when given " + testCase[0], function () {
      function testBody() {
        multerS3(extend(VALID_OPTIONS, testCase[1]));
      }

      assert.throws(testBody, TypeError);
    });
  });

  it("upload files", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({ s3: s3, bucket: "test" });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.equal(req.file.etag, "mock-etag");
      assert.equal(req.file.location, "mock-location");

      done();
    });
  });

  it("uploads file with AES256 server-side encryption", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({
      s3: s3,
      bucket: "test",
      serverSideEncryption: "AES256",
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.equal(req.file.etag, "mock-etag");
      assert.equal(req.file.location, "mock-location");
      assert.equal(req.file.serverSideEncryption, "AES256");

      done();
    });
  });

  it("uploads file with AWS KMS-managed server-side encryption", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({
      s3: s3,
      bucket: "test",
      serverSideEncryption: "aws:kms",
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.equal(req.file.etag, "mock-etag");
      assert.equal(req.file.location, "mock-location");
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("uploads PNG file with correct content-type", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({
      s3: s3,
      bucket: "test",
      serverSideEncryption: "aws:kms",
      contentType: AUTO_CONTENT_TYPE,
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.contentType, "image/png");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.equal(req.file.etag, "mock-etag");
      assert.equal(req.file.location, "mock-location");
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("uploads SVG file with correct content-type", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({
      s3: s3,
      bucket: "test",
      serverSideEncryption: "aws:kms",
      contentType: AUTO_CONTENT_TYPE,
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(path.join(__dirname, "files", "test.svg"));

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.contentType, "image/svg+xml");
      assert.equal(req.file.originalname, "test.svg");
      assert.equal(req.file.size, 100);
      assert.equal(req.file.bucket, "test");
      assert.equal(req.file.etag, "mock-etag");
      assert.equal(req.file.location, "mock-location");
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("upload transformed files", function (done) {
    var s3 = mockS3();
    var form = new FormData();
    var storage = multerS3({
      s3: s3,
      bucket: "test",
      shouldTransform: true,
      transforms: [
        {
          key: "test",
          transform: function (req, file, cb) {
            cb(null, new stream.PassThrough());
          },
        },
        {
          key: "test2",
          transform: function (req, file, cb) {
            cb(null, new stream.PassThrough());
          },
        },
      ],
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");
      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.transforms[0].size, 68);
      assert.equal(req.file.transforms[0].bucket, "test");
      assert.equal(req.file.transforms[0].key, "test");
      assert.equal(req.file.transforms[0].etag, "mock-etag");
      assert.equal(req.file.transforms[0].location, "mock-location");
      assert.equal(req.file.transforms[1].key, "test2");

      done();
    });
  });
});
