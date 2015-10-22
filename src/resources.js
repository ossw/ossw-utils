import {computedFrom} from 'aurelia-framework';
import {inject} from 'aurelia-dependency-injection';
import {ObserverLocator, bindable} from 'aurelia-binding';  // or 'aurelia-framework'

import * as base64 from 'base64-js';

@inject(ObserverLocator)
export class ResourceBuilder{
  resourceTypes = [{label: 'Image', value: 'image'}, {label: 'Image set', value: 'imageSet'}, {label: 'Numbers font', value: 'numbersFont'}];
  resourceType = this.resourceTypes[0].value;
  resourceId
  firstImageId;
  numberOfImages;
  lastLoadedImage;

  imgPreviews = [];

    constructor(observerLocator) {
      // subscribe to the "bar" property's changes/
      var subscription = observerLocator
        .getObserver(this, 'resourceType')
        .subscribe((v) => this.handleResourceTypeChange(v));

      var subscription2 = observerLocator
        .getObserver(this, 'firstImageId')
        .subscribe((v) => this.calculateResourceData());

      var subscription2 = observerLocator
        .getObserver(this, 'numberOfImages')
        .subscribe((v) => this.calculateResourceData());
    }

    @computedFrom('resourceType')
    get staticImage(){
      console.log(this.resourceType);
      return this.resourceType == 'image';
    }

  handleResourceTypeChange(newValue) {
      this.resetImageAndData();
      if (newValue == 'imageSet') {
          this.firstImageId = 0;
          this.numberOfImages = 2;
      }
  }

  resetImageAndData() {
    this.lastLoadedImage = null;
    this.resourceData = "";
    fileInput.value = null;
    this.imgPreviews = [];
  }

  onFileSelected(event) {
        var file = event.srcElement.files[0];
  			var imageType = /image.*/;

        if (!file) {
            this.resetImageAndData();
            return
        }

        var top = this;
  			if (file.type.match(imageType)) {
  				var reader = new FileReader();

  				reader.onload = function(e) {
  					//fileDisplayArea.innerHTML = "";

  					top.lastLoadedImage = new Image();
  					top.lastLoadedImage.src = reader.result;

  					//fileDisplayArea.appendChild(img);
            top.calculateResourceData();
  				}

  				reader.readAsDataURL(file);

  			} else {
  				//fileDisplayArea.innerHTML = "File not supported!";
            this.resetImageAndData();
  			}
  	}

  	calculateResourceData() {
  	    switch(this.resourceType) {
  	      case "image":
            this.resourceData = this.buildImageData(this.lastLoadedImage);
  	        break;
  	      case "numbersFont":
            this.resourceData = this.buildNumbersFontData(this.lastLoadedImage);
  	        break;
  	      case "imageSet":
            this.resourceData = this.buildImageEnumerationData(this.lastLoadedImage);
  	        break;
  	      default:
  	        this.resourceData = "";
  	    }
  	}

    buildImageData(img) {
      var width = img.width >= 144 ? 144 : img.width;
      var height = img.height >= 168 ? 168 : img.height;
      var byteWidth = Math.ceil(width/8);

      var canvas = document.createElement('canvas');
  		canvas.width = width;
  		canvas.height = height;

      var ctx = canvas.getContext("2d");

      ctx.drawImage(img,0,0);

      var imgd = ctx.getImageData(0, 0, width, height);
      var pix = imgd.data;

      var headerSize = 4;

      var watchData = new Array(headerSize+byteWidth*height);
      watchData[0] = 0x1; // 0x1 - static image
      watchData[1] = 0; // format type
      watchData[2] = width;
      watchData[3] = height;

      for (var y=0; y<height; y++){
          for (var x=0; x<width; x++) {
              var i = 4*(x+y*width);
              var value = (pix[i] + pix[i+1] + pix[i+2] >= 127)?255:0;

              pix[i] = value;
              pix[i+1] = value;
              pix[i+2] = value;
              pix[i+3] = 255;

              var b = Math.floor(x/8) + (byteWidth*y);

              if(x%8==0) {
                  watchData[headerSize+b] = value == 255 ? 1<<7 : 0;
              } else if(value == 255) {
                  watchData[headerSize+b] = watchData[headerSize+b] | (1<<(7-(x%8)))
              }
          }
      }

      ctx.putImageData(imgd, 0, 0);

      this.imgPreviews = [{src: canvas.toDataURL()}];

      return base64.fromByteArray(watchData);
    }


    buildNumbersFontData(img) {
        var width = (img.width/10) >= 144 ? 144 : img.width/10;
        var height = img.height >= 168 ? 168 : img.height;
        var byteWidth = Math.ceil(width/8);

        var canvas = document.createElement('canvas');
    		canvas.width = width;
    		canvas.height = height;

        var headerSize = 4;

        var watchData = new Array(headerSize+byteWidth*height);
        watchData[0] = 0x3; // 0x3 - numbers font
        watchData[1] = 0; // format type
        watchData[2] = width;
        watchData[3] = height;


        var ctx = canvas.getContext("2d");

        var previews = [];
        var dataOffset = headerSize;
        for (var n=0; n<10; n++) {
            ctx.drawImage(img,-n*width,0);
            var imgd = ctx.getImageData(0, 0, width, height);
            var pix = imgd.data;
            for (var y=0; y<height; y++){
                for (var x=0; x<width; x++) {
                    var i = 4*(x+y*width);
                    var value = (pix[i] + pix[i+1] + pix[i+2] >= 127)?255:0;

                    pix[i] = value;
                    pix[i+1] = value;
                    pix[i+2] = value;
                    pix[i+3] = 255;

                    var b = Math.floor(x/8) + (byteWidth*y);

                    if(x%8==0) {
                        watchData[dataOffset+b] = value == 255 ? 1<<7 : 0;
                    } else if(value == 255) {
                        watchData[dataOffset+b] = watchData[dataOffset+b] | (1<<(7-(x%8)))
                    }
                }
            }
            ctx.putImageData(imgd, 0, 0);
            previews.push({src: canvas.toDataURL()});
            dataOffset+=byteWidth*height;
        }

        this.imgPreviews = previews;

        return base64.fromByteArray(watchData);
    }

    buildImageEnumerationData(img) {
        if (!this.firstImageId) {
          this.firstImageId = 0;
        };
        if (!this.numberOfImages) {
          this.numberOfImages = 1;
        };

        var width = (img.width/this.numberOfImages) >= 144 ? 144 : img.width/this.numberOfImages;
        var height = img.height >= 168 ? 168 : img.height;
        var byteWidth = Math.ceil(width/8);

        var canvas = document.createElement('canvas');
    		canvas.width = width;
    		canvas.height = height;

        var headerSize = 6;

        var watchData = new Array(headerSize+byteWidth*height);
        watchData[0] = 0x2; // 0x2 - image enumeration
        watchData[1] = 0; // format type
        watchData[2] = parseInt(this.firstImageId);
        watchData[3] = parseInt(this.numberOfImages);
        watchData[4] = width;
        watchData[5] = height;


        var ctx = canvas.getContext("2d");

        var previews = [];
        var dataOffset = headerSize;
        for (var n=0; n<this.numberOfImages; n++) {
            ctx.drawImage(img,-n*width,0);
            var imgd = ctx.getImageData(0, 0, width, height);
            var pix = imgd.data;
            for (var y=0; y<height; y++){
                for (var x=0; x<width; x++) {
                    var i = 4*(x+y*width);
                    var value = (pix[i] + pix[i+1] + pix[i+2] >= 127)?255:0;

                    pix[i] = value;
                    pix[i+1] = value;
                    pix[i+2] = value;
                    pix[i+3] = 255;

                    var b = Math.floor(x/8) + (byteWidth*y);

                    if(x%8==0) {
                        watchData[dataOffset+b] = value == 255 ? 1<<7 : 0;
                    } else if(value == 255) {
                        watchData[dataOffset+b] = watchData[dataOffset+b] | (1<<(7-(x%8)))
                    }
                }
            }
            ctx.putImageData(imgd, 0, 0);
            previews.push({src: canvas.toDataURL()});
            dataOffset+=byteWidth*height;
        }

        this.imgPreviews = previews;

        return base64.fromByteArray(watchData);
    }
}
