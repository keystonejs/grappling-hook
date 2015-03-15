"use strict";
/* global describe, it, beforeEach, afterEach */
/* jshint unused:false */

var expect = require( "must" );
var subject = require( "./index" );
var sinon = require( "sinon" );

describe( "-- prepost --", function(){
  describe( "spec file", function(){
    it( "should be found", function(){
      expect( true ).to.be.true();
    } );
  } );
  describe( "module", function(){
    it( "should expose a `mixin` function", function(){
      expect( subject.mixin ).to.be.a.function();
    } );
    it( "should expose a `create` function", function(){
      expect( subject.create ).to.be.a.function();
    } );
  } );
  describe( "#mixin", function(){
    it( "should add prepost functions to an existing object", function(){
      var instance = {};
      subject.mixin( instance );
      expect( instance ).to.have.keys( [ "pre", "post", "addHook", "hooks", "register", "__prepost" ] );
    } );
  } );
  describe( "#create", function(){
    it( "should return a prepost object", function(){
      var instance = subject.create();
      expect( instance ).to.have.keys( [ "pre", "post", "addHook", "hooks", "register", "__prepost" ] );
    } );
  } );
  describe( "instance", function(){
    var instance;
    beforeEach( function(){
      instance = subject.create();
    } );
    describe( "#register", function(){
      it( "should throw an error for anything else but `pre` or `post`", function(){
        expect( function(){
          instance.register( "nope:not valid!" );
        } ).to.throw( /pre|post/ );
      } );
      it( "should register a type:event hook", function(){
        var hook = function(){
        };
        instance.register( "pre:test" );
        instance.pre( "test", hook );
        instance.hooks( "pre:test", function( callback,
                                              next ){
          expect( callback ).to.equal( hook );
          next();
        } );
      } );
      it( "should accept multiple type:event hooks", function(){
        var hook = function(){
        };
        instance.register("pre:test", "post:test");
        instance.post( "test", hook );
        instance.hooks( "post:test", function( callback,
                                              next ){
          expect( callback ).to.equal( hook );
          next();
        } );
      } );
      it( "should accept an array of type:event hooks", function(){
        var hook = function(){
        };
        instance.register(["pre:test", "post:test"]);
        instance.post( "test", hook );
        instance.hooks( "post:test", function( callback,
                                              next ){
          expect( callback ).to.equal( hook );
          next();
        } );
      } );
    } );
  } );
} );

