var M2=Object.defineProperty;var v2=($)=>$;function A2($,J){this[$]=v2.bind(null,J)}var nY=($,J)=>{for(var Q in J)M2($,Q,{get:J[Q],enumerable:!0,configurable:!0,set:A2.bind(J,Q)})};var pQ=($,J)=>()=>($&&(J=$($=0)),J);class d5{addEventListener($,J){if(this._listeners===void 0)this._listeners={};let Q=this._listeners;if(Q[$]===void 0)Q[$]=[];if(Q[$].indexOf(J)===-1)Q[$].push(J)}hasEventListener($,J){let Q=this._listeners;if(Q===void 0)return!1;return Q[$]!==void 0&&Q[$].indexOf(J)!==-1}removeEventListener($,J){let Q=this._listeners;if(Q===void 0)return;let Z=Q[$];if(Z!==void 0){let Y=Z.indexOf(J);if(Y!==-1)Z.splice(Y,1)}}dispatchEvent($){let J=this._listeners;if(J===void 0)return;let Q=J[$.type];if(Q!==void 0){$.target=this;let Z=Q.slice(0);for(let Y=0,V=Z.length;Y<V;Y++)Z[Y].call(this,$);$.target=null}}}function t7(){let $=Math.random()*4294967295|0,J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(c9[$&255]+c9[$>>8&255]+c9[$>>16&255]+c9[$>>24&255]+"-"+c9[J&255]+c9[J>>8&255]+"-"+c9[J>>16&15|64]+c9[J>>24&255]+"-"+c9[Q&63|128]+c9[Q>>8&255]+"-"+c9[Q>>16&255]+c9[Q>>24&255]+c9[Z&255]+c9[Z>>8&255]+c9[Z>>16&255]+c9[Z>>24&255]).toLowerCase()}function w$($,J,Q){return Math.max(J,Math.min(Q,$))}function AX($,J){return($%J+J)%J}function T2($,J,Q,Z,Y){return Z+($-J)*(Y-Z)/(Q-J)}function S2($,J,Q){if($!==J)return(Q-$)/(J-$);else return 0}function uJ($,J,Q){return(1-Q)*$+Q*J}function k2($,J,Q,Z){return uJ($,J,1-Math.exp(-Q*Z))}function z2($,J=1){return J-Math.abs(AX($,J*2)-J)}function w2($,J,Q){if($<=J)return 0;if($>=Q)return 1;return $=($-J)/(Q-J),$*$*(3-2*$)}function _2($,J,Q){if($<=J)return 0;if($>=Q)return 1;return $=($-J)/(Q-J),$*$*$*($*($*6-15)+10)}function y2($,J){return $+Math.floor(Math.random()*(J-$+1))}function f2($,J){return $+Math.random()*(J-$)}function b2($){return $*(0.5-Math.random())}function h2($){if($!==void 0)sY=$;let J=sY+=1831565813;return J=Math.imul(J^J>>>15,J|1),J^=J+Math.imul(J^J>>>7,J|61),((J^J>>>14)>>>0)/4294967296}function x2($){return $*gJ}function g2($){return $*_6}function u2($){return($&$-1)===0&&$!==0}function p2($){return Math.pow(2,Math.ceil(Math.log($)/Math.LN2))}function l2($){return Math.pow(2,Math.floor(Math.log($)/Math.LN2))}function d2($,J,Q,Z,Y){let{cos:V,sin:q}=Math,U=V(Q/2),F=q(Q/2),N=V((J+Z)/2),L=q((J+Z)/2),I=V((J-Z)/2),P=q((J-Z)/2),C=V((Z-J)/2),M=q((Z-J)/2);switch(Y){case"XYX":$.set(U*L,F*I,F*P,U*N);break;case"YZY":$.set(F*P,U*L,F*I,U*N);break;case"ZXZ":$.set(F*I,F*P,U*L,U*N);break;case"XZX":$.set(U*L,F*M,F*C,U*N);break;case"YXY":$.set(F*C,U*L,F*M,U*N);break;case"ZYZ":$.set(F*M,F*C,U*L,U*N);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+Y)}}function r7($,J){switch(J.constructor){case Float32Array:return $;case Uint32Array:return $/4294967295;case Uint16Array:return $/65535;case Uint8Array:return $/255;case Int32Array:return Math.max($/2147483647,-1);case Int16Array:return Math.max($/32767,-1);case Int8Array:return Math.max($/127,-1);default:throw Error("Invalid component type.")}}function $9($,J){switch(J.constructor){case Float32Array:return $;case Uint32Array:return Math.round($*4294967295);case Uint16Array:return Math.round($*65535);case Uint8Array:return Math.round($*255);case Int32Array:return Math.round($*2147483647);case Int16Array:return Math.round($*32767);case Int8Array:return Math.round($*127);default:throw Error("Invalid component type.")}}class A${constructor($,J,Q,Z,Y,V,q,U,F){if(A$.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],$!==void 0)this.set($,J,Q,Z,Y,V,q,U,F)}set($,J,Q,Z,Y,V,q,U,F){let N=this.elements;return N[0]=$,N[1]=Z,N[2]=q,N[3]=J,N[4]=Y,N[5]=U,N[6]=Q,N[7]=V,N[8]=F,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy($){let J=this.elements,Q=$.elements;return J[0]=Q[0],J[1]=Q[1],J[2]=Q[2],J[3]=Q[3],J[4]=Q[4],J[5]=Q[5],J[6]=Q[6],J[7]=Q[7],J[8]=Q[8],this}extractBasis($,J,Q){return $.setFromMatrix3Column(this,0),J.setFromMatrix3Column(this,1),Q.setFromMatrix3Column(this,2),this}setFromMatrix4($){let J=$.elements;return this.set(J[0],J[4],J[8],J[1],J[5],J[9],J[2],J[6],J[10]),this}multiply($){return this.multiplyMatrices(this,$)}premultiply($){return this.multiplyMatrices($,this)}multiplyMatrices($,J){let Q=$.elements,Z=J.elements,Y=this.elements,V=Q[0],q=Q[3],U=Q[6],F=Q[1],N=Q[4],L=Q[7],I=Q[2],P=Q[5],C=Q[8],M=Z[0],A=Z[3],R=Z[6],E=Z[1],y=Z[4],G=Z[7],f=Z[2],d=Z[5],g=Z[8];return Y[0]=V*M+q*E+U*f,Y[3]=V*A+q*y+U*d,Y[6]=V*R+q*G+U*g,Y[1]=F*M+N*E+L*f,Y[4]=F*A+N*y+L*d,Y[7]=F*R+N*G+L*g,Y[2]=I*M+P*E+C*f,Y[5]=I*A+P*y+C*d,Y[8]=I*R+P*G+C*g,this}multiplyScalar($){let J=this.elements;return J[0]*=$,J[3]*=$,J[6]*=$,J[1]*=$,J[4]*=$,J[7]*=$,J[2]*=$,J[5]*=$,J[8]*=$,this}determinant(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],Y=$[3],V=$[4],q=$[5],U=$[6],F=$[7],N=$[8];return J*V*N-J*q*F-Q*Y*N+Q*q*U+Z*Y*F-Z*V*U}invert(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],Y=$[3],V=$[4],q=$[5],U=$[6],F=$[7],N=$[8],L=N*V-q*F,I=q*U-N*Y,P=F*Y-V*U,C=J*L+Q*I+Z*P;if(C===0)return this.set(0,0,0,0,0,0,0,0,0);let M=1/C;return $[0]=L*M,$[1]=(Z*F-N*Q)*M,$[2]=(q*Q-Z*V)*M,$[3]=I*M,$[4]=(N*J-Z*U)*M,$[5]=(Z*Y-q*J)*M,$[6]=P*M,$[7]=(Q*U-F*J)*M,$[8]=(V*J-Q*Y)*M,this}transpose(){let $,J=this.elements;return $=J[1],J[1]=J[3],J[3]=$,$=J[2],J[2]=J[6],J[6]=$,$=J[5],J[5]=J[7],J[7]=$,this}getNormalMatrix($){return this.setFromMatrix4($).invert().transpose()}transposeIntoArray($){let J=this.elements;return $[0]=J[0],$[1]=J[3],$[2]=J[6],$[3]=J[1],$[4]=J[4],$[5]=J[7],$[6]=J[2],$[7]=J[5],$[8]=J[8],this}setUvTransform($,J,Q,Z,Y,V,q){let U=Math.cos(Y),F=Math.sin(Y);return this.set(Q*U,Q*F,-Q*(U*V+F*q)+V+$,-Z*F,Z*U,-Z*(-F*V+U*q)+q+J,0,0,1),this}scale($,J){return this.premultiply(c4.makeScale($,J)),this}rotate($){return this.premultiply(c4.makeRotation(-$)),this}translate($,J){return this.premultiply(c4.makeTranslation($,J)),this}makeTranslation($,J){if($.isVector2)this.set(1,0,$.x,0,1,$.y,0,0,1);else this.set(1,0,$,0,1,J,0,0,1);return this}makeRotation($){let J=Math.cos($),Q=Math.sin($);return this.set(J,-Q,0,Q,J,0,0,0,1),this}makeScale($,J){return this.set($,0,0,0,J,0,0,0,1),this}equals($){let J=this.elements,Q=$.elements;for(let Z=0;Z<9;Z++)if(J[Z]!==Q[Z])return!1;return!0}fromArray($,J=0){for(let Q=0;Q<9;Q++)this.elements[Q]=$[Q+J];return this}toArray($=[],J=0){let Q=this.elements;return $[J]=Q[0],$[J+1]=Q[1],$[J+2]=Q[2],$[J+3]=Q[3],$[J+4]=Q[4],$[J+5]=Q[5],$[J+6]=Q[6],$[J+7]=Q[7],$[J+8]=Q[8],$}clone(){return new this.constructor().fromArray(this.elements)}}function QK($){for(let J=$.length-1;J>=0;--J)if($[J]>=65535)return!0;return!1}function lJ($){return document.createElementNS("http://www.w3.org/1999/xhtml",$)}function c2(){let $=lJ("canvas");return $.style.display="block",$}function dJ($){if($ in aY)return;aY[$]=!0,console.warn($)}function o2($,J,Q){return new Promise(function(Z,Y){function V(){switch($.clientWaitSync(J,$.SYNC_FLUSH_COMMANDS_BIT,0)){case $.WAIT_FAILED:Y();break;case $.TIMEOUT_EXPIRED:setTimeout(V,Q);break;default:Z()}}setTimeout(V,Q)})}function n2(){let $={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(Y,V,q){if(this.enabled===!1||V===q||!V||!q)return Y;if(this.spaces[V].transfer==="srgb")Y.r=u8(Y.r),Y.g=u8(Y.g),Y.b=u8(Y.b);if(this.spaces[V].primaries!==this.spaces[q].primaries)Y.applyMatrix3(this.spaces[V].toXYZ),Y.applyMatrix3(this.spaces[q].fromXYZ);if(this.spaces[q].transfer==="srgb")Y.r=w6(Y.r),Y.g=w6(Y.g),Y.b=w6(Y.b);return Y},workingToColorSpace:function(Y,V){return this.convert(Y,this.workingColorSpace,V)},colorSpaceToWorking:function(Y,V){return this.convert(Y,V,this.workingColorSpace)},getPrimaries:function(Y){return this.spaces[Y].primaries},getTransfer:function(Y){if(Y==="")return"linear";return this.spaces[Y].transfer},getToneMappingMode:function(Y){return this.spaces[Y].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(Y,V=this.workingColorSpace){return Y.fromArray(this.spaces[V].luminanceCoefficients)},define:function(Y){Object.assign(this.spaces,Y)},_getMatrix:function(Y,V,q){return Y.copy(this.spaces[V].toXYZ).multiply(this.spaces[q].fromXYZ)},_getDrawingBufferColorSpace:function(Y){return this.spaces[Y].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(Y=this.workingColorSpace){return this.spaces[Y].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(Y,V){return dJ("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),$.workingToColorSpace(Y,V)},toWorkingColorSpace:function(Y,V){return dJ("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),$.colorSpaceToWorking(Y,V)}},J=[0.64,0.33,0.3,0.6,0.15,0.06],Q=[0.2126,0.7152,0.0722],Z=[0.3127,0.329];return $.define({["srgb-linear"]:{primaries:J,whitePoint:Z,transfer:"linear",toXYZ:rY,fromXYZ:tY,luminanceCoefficients:Q,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:J,whitePoint:Z,transfer:"srgb",toXYZ:rY,fromXYZ:tY,luminanceCoefficients:Q,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),$}function u8($){return $<0.04045?$*0.0773993808:Math.pow($*0.9478672986+0.0521327014,2.4)}function w6($){return $<0.0031308?$*12.92:1.055*Math.pow($,0.41666)-0.055}class ZK{static getDataURL($,J="image/png"){if(/^data:/i.test($.src))return $.src;if(typeof HTMLCanvasElement>"u")return $.src;let Q;if($ instanceof HTMLCanvasElement)Q=$;else{if(H6===void 0)H6=lJ("canvas");H6.width=$.width,H6.height=$.height;let Z=H6.getContext("2d");if($ instanceof ImageData)Z.putImageData($,0,0);else Z.drawImage($,0,0,$.width,$.height);Q=H6}return Q.toDataURL(J)}static sRGBToLinear($){if(typeof HTMLImageElement<"u"&&$ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&$ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&$ instanceof ImageBitmap){let J=lJ("canvas");J.width=$.width,J.height=$.height;let Q=J.getContext("2d");Q.drawImage($,0,0,$.width,$.height);let Z=Q.getImageData(0,0,$.width,$.height),Y=Z.data;for(let V=0;V<Y.length;V++)Y[V]=u8(Y[V]/255)*255;return Q.putImageData(Z,0,0),J}else if($.data){let J=$.data.slice(0);for(let Q=0;Q<J.length;Q++)if(J instanceof Uint8Array||J instanceof Uint8ClampedArray)J[Q]=Math.floor(u8(J[Q]/255)*255);else J[Q]=u8(J[Q]);return{data:J,width:$.width,height:$.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),$}}class RZ{constructor($=null){this.isSource=!0,Object.defineProperty(this,"id",{value:s2++}),this.uuid=t7(),this.data=$,this.dataReady=!0,this.version=0}getSize($){let J=this.data;if(typeof HTMLVideoElement<"u"&&J instanceof HTMLVideoElement)$.set(J.videoWidth,J.videoHeight,0);else if(J instanceof VideoFrame)$.set(J.displayHeight,J.displayWidth,0);else if(J!==null)$.set(J.width,J.height,J.depth||0);else $.set(0,0,0);return $}set needsUpdate($){if($===!0)this.version++}toJSON($){let J=$===void 0||typeof $==="string";if(!J&&$.images[this.uuid]!==void 0)return $.images[this.uuid];let Q={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let Y;if(Array.isArray(Z)){Y=[];for(let V=0,q=Z.length;V<q;V++)if(Z[V].isDataTexture)Y.push(o4(Z[V].image));else Y.push(o4(Z[V]))}else Y=o4(Z);Q.url=Y}if(!J)$.images[this.uuid]=Q;return Q}}function o4($){if(typeof HTMLImageElement<"u"&&$ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&$ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&$ instanceof ImageBitmap)return ZK.getDataURL($);else if($.data)return{data:Array.from($.data),width:$.width,height:$.height,type:$.data.constructor.name};else return console.warn("THREE.Texture: Unable to serialize Texture."),{}}class O8{constructor($=new s(1/0,1/0,1/0),J=new s(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=$,this.max=J}set($,J){return this.min.copy($),this.max.copy(J),this}setFromArray($){this.makeEmpty();for(let J=0,Q=$.length;J<Q;J+=3)this.expandByPoint(s7.fromArray($,J));return this}setFromBufferAttribute($){this.makeEmpty();for(let J=0,Q=$.count;J<Q;J++)this.expandByPoint(s7.fromBufferAttribute($,J));return this}setFromPoints($){this.makeEmpty();for(let J=0,Q=$.length;J<Q;J++)this.expandByPoint($[J]);return this}setFromCenterAndSize($,J){let Q=s7.copy(J).multiplyScalar(0.5);return this.min.copy($).sub(Q),this.max.copy($).add(Q),this}setFromObject($,J=!1){return this.makeEmpty(),this.expandByObject($,J)}clone(){return new this.constructor().copy(this)}copy($){return this.min.copy($.min),this.max.copy($.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter($){return this.isEmpty()?$.set(0,0,0):$.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize($){return this.isEmpty()?$.set(0,0,0):$.subVectors(this.max,this.min)}expandByPoint($){return this.min.min($),this.max.max($),this}expandByVector($){return this.min.sub($),this.max.add($),this}expandByScalar($){return this.min.addScalar(-$),this.max.addScalar($),this}expandByObject($,J=!1){$.updateWorldMatrix(!1,!1);let Q=$.geometry;if(Q!==void 0){let Y=Q.getAttribute("position");if(J===!0&&Y!==void 0&&$.isInstancedMesh!==!0)for(let V=0,q=Y.count;V<q;V++){if($.isMesh===!0)$.getVertexPosition(V,s7);else s7.fromBufferAttribute(Y,V);s7.applyMatrix4($.matrixWorld),this.expandByPoint(s7)}else{if($.boundingBox!==void 0){if($.boundingBox===null)$.computeBoundingBox();lQ.copy($.boundingBox)}else{if(Q.boundingBox===null)Q.computeBoundingBox();lQ.copy(Q.boundingBox)}lQ.applyMatrix4($.matrixWorld),this.union(lQ)}}let Z=$.children;for(let Y=0,V=Z.length;Y<V;Y++)this.expandByObject(Z[Y],J);return this}containsPoint($){return $.x>=this.min.x&&$.x<=this.max.x&&$.y>=this.min.y&&$.y<=this.max.y&&$.z>=this.min.z&&$.z<=this.max.z}containsBox($){return this.min.x<=$.min.x&&$.max.x<=this.max.x&&this.min.y<=$.min.y&&$.max.y<=this.max.y&&this.min.z<=$.min.z&&$.max.z<=this.max.z}getParameter($,J){return J.set(($.x-this.min.x)/(this.max.x-this.min.x),($.y-this.min.y)/(this.max.y-this.min.y),($.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox($){return $.max.x>=this.min.x&&$.min.x<=this.max.x&&$.max.y>=this.min.y&&$.min.y<=this.max.y&&$.max.z>=this.min.z&&$.min.z<=this.max.z}intersectsSphere($){return this.clampPoint($.center,s7),s7.distanceToSquared($.center)<=$.radius*$.radius}intersectsPlane($){let J,Q;if($.normal.x>0)J=$.normal.x*this.min.x,Q=$.normal.x*this.max.x;else J=$.normal.x*this.max.x,Q=$.normal.x*this.min.x;if($.normal.y>0)J+=$.normal.y*this.min.y,Q+=$.normal.y*this.max.y;else J+=$.normal.y*this.max.y,Q+=$.normal.y*this.min.y;if($.normal.z>0)J+=$.normal.z*this.min.z,Q+=$.normal.z*this.max.z;else J+=$.normal.z*this.max.z,Q+=$.normal.z*this.min.z;return J<=-$.constant&&Q>=-$.constant}intersectsTriangle($){if(this.isEmpty())return!1;this.getCenter(AJ),dQ.subVectors(this.max,AJ),F6.subVectors($.a,AJ),B6.subVectors($.b,AJ),N6.subVectors($.c,AJ),V5.subVectors(B6,F6),K5.subVectors(N6,B6),f5.subVectors(F6,N6);let J=[0,-V5.z,V5.y,0,-K5.z,K5.y,0,-f5.z,f5.y,V5.z,0,-V5.x,K5.z,0,-K5.x,f5.z,0,-f5.x,-V5.y,V5.x,0,-K5.y,K5.x,0,-f5.y,f5.x,0];if(!s4(J,F6,B6,N6,dQ))return!1;if(J=[1,0,0,0,1,0,0,0,1],!s4(J,F6,B6,N6,dQ))return!1;return mQ.crossVectors(V5,K5),J=[mQ.x,mQ.y,mQ.z],s4(J,F6,B6,N6,dQ)}clampPoint($,J){return J.copy($).clamp(this.min,this.max)}distanceToPoint($){return this.clampPoint($,s7).distanceTo($)}getBoundingSphere($){if(this.isEmpty())$.makeEmpty();else this.getCenter($.center),$.radius=this.getSize(s7).length()*0.5;return $}intersect($){if(this.min.max($.min),this.max.min($.max),this.isEmpty())this.makeEmpty();return this}union($){return this.min.min($.min),this.max.max($.max),this}applyMatrix4($){if(this.isEmpty())return this;return w8[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4($),w8[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4($),w8[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4($),w8[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4($),w8[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4($),w8[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4($),w8[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4($),w8[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4($),this.setFromPoints(w8),this}translate($){return this.min.add($),this.max.add($),this}equals($){return $.min.equals(this.min)&&$.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON($){return this.min.fromArray($.min),this.max.fromArray($.max),this}}function s4($,J,Q,Z,Y){for(let V=0,q=$.length-3;V<=q;V+=3){b5.fromArray($,V);let U=Y.x*Math.abs(b5.x)+Y.y*Math.abs(b5.y)+Y.z*Math.abs(b5.z),F=J.dot(b5),N=Q.dot(b5),L=Z.dot(b5);if(Math.max(-Math.max(F,N,L),Math.min(F,N,L))>U)return!1}return!0}class $8{constructor($=new s,J=-1){this.isSphere=!0,this.center=$,this.radius=J}set($,J){return this.center.copy($),this.radius=J,this}setFromPoints($,J){let Q=this.center;if(J!==void 0)Q.copy(J);else a2.setFromPoints($).getCenter(Q);let Z=0;for(let Y=0,V=$.length;Y<V;Y++)Z=Math.max(Z,Q.distanceToSquared($[Y]));return this.radius=Math.sqrt(Z),this}copy($){return this.center.copy($.center),this.radius=$.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint($){return $.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint($){return $.distanceTo(this.center)-this.radius}intersectsSphere($){let J=this.radius+$.radius;return $.center.distanceToSquared(this.center)<=J*J}intersectsBox($){return $.intersectsSphere(this)}intersectsPlane($){return Math.abs($.distanceToPoint(this.center))<=this.radius}clampPoint($,J){let Q=this.center.distanceToSquared($);if(J.copy($),Q>this.radius*this.radius)J.sub(this.center).normalize(),J.multiplyScalar(this.radius).add(this.center);return J}getBoundingBox($){if(this.isEmpty())return $.makeEmpty(),$;return $.set(this.center,this.center),$.expandByScalar(this.radius),$}applyMatrix4($){return this.center.applyMatrix4($),this.radius=this.radius*$.getMaxScaleOnAxis(),this}translate($){return this.center.add($),this}expandByPoint($){if(this.isEmpty())return this.center.copy($),this.radius=0,this;TJ.subVectors($,this.center);let J=TJ.lengthSq();if(J>this.radius*this.radius){let Q=Math.sqrt(J),Z=(Q-this.radius)*0.5;this.center.addScaledVector(TJ,Z/Q),this.radius+=Z}return this}union($){if($.isEmpty())return this;if(this.isEmpty())return this.copy($),this;if(this.center.equals($.center)===!0)this.radius=Math.max(this.radius,$.radius);else i4.subVectors($.center,this.center).setLength($.radius),this.expandByPoint(TJ.copy($.center).add(i4)),this.expandByPoint(TJ.copy($.center).sub(i4));return this}equals($){return $.center.equals(this.center)&&$.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON($){return this.radius=$.radius,this.center.fromArray($.center),this}}class cJ{constructor($=new s,J=new s(0,0,-1)){this.origin=$,this.direction=J}set($,J){return this.origin.copy($),this.direction.copy(J),this}copy($){return this.origin.copy($.origin),this.direction.copy($.direction),this}at($,J){return J.copy(this.origin).addScaledVector(this.direction,$)}lookAt($){return this.direction.copy($).sub(this.origin).normalize(),this}recast($){return this.origin.copy(this.at($,_8)),this}closestPointToPoint($,J){J.subVectors($,this.origin);let Q=J.dot(this.direction);if(Q<0)return J.copy(this.origin);return J.copy(this.origin).addScaledVector(this.direction,Q)}distanceToPoint($){return Math.sqrt(this.distanceSqToPoint($))}distanceSqToPoint($){let J=_8.subVectors($,this.origin).dot(this.direction);if(J<0)return this.origin.distanceToSquared($);return _8.copy(this.origin).addScaledVector(this.direction,J),_8.distanceToSquared($)}distanceSqToSegment($,J,Q,Z){a4.copy($).add(J).multiplyScalar(0.5),cQ.copy(J).sub($).normalize(),U5.copy(this.origin).sub(a4);let Y=$.distanceTo(J)*0.5,V=-this.direction.dot(cQ),q=U5.dot(this.direction),U=-U5.dot(cQ),F=U5.lengthSq(),N=Math.abs(1-V*V),L,I,P,C;if(N>0)if(L=V*U-q,I=V*q-U,C=Y*N,L>=0)if(I>=-C)if(I<=C){let M=1/N;L*=M,I*=M,P=L*(L+V*I+2*q)+I*(V*L+I+2*U)+F}else I=Y,L=Math.max(0,-(V*I+q)),P=-L*L+I*(I+2*U)+F;else I=-Y,L=Math.max(0,-(V*I+q)),P=-L*L+I*(I+2*U)+F;else if(I<=-C)L=Math.max(0,-(-V*Y+q)),I=L>0?-Y:Math.min(Math.max(-Y,-U),Y),P=-L*L+I*(I+2*U)+F;else if(I<=C)L=0,I=Math.min(Math.max(-Y,-U),Y),P=I*(I+2*U)+F;else L=Math.max(0,-(V*Y+q)),I=L>0?Y:Math.min(Math.max(-Y,-U),Y),P=-L*L+I*(I+2*U)+F;else I=V>0?-Y:Y,L=Math.max(0,-(V*I+q)),P=-L*L+I*(I+2*U)+F;if(Q)Q.copy(this.origin).addScaledVector(this.direction,L);if(Z)Z.copy(a4).addScaledVector(cQ,I);return P}intersectSphere($,J){_8.subVectors($.center,this.origin);let Q=_8.dot(this.direction),Z=_8.dot(_8)-Q*Q,Y=$.radius*$.radius;if(Z>Y)return null;let V=Math.sqrt(Y-Z),q=Q-V,U=Q+V;if(U<0)return null;if(q<0)return this.at(U,J);return this.at(q,J)}intersectsSphere($){if($.radius<0)return!1;return this.distanceSqToPoint($.center)<=$.radius*$.radius}distanceToPlane($){let J=$.normal.dot(this.direction);if(J===0){if($.distanceToPoint(this.origin)===0)return 0;return null}let Q=-(this.origin.dot($.normal)+$.constant)/J;return Q>=0?Q:null}intersectPlane($,J){let Q=this.distanceToPlane($);if(Q===null)return null;return this.at(Q,J)}intersectsPlane($){let J=$.distanceToPoint(this.origin);if(J===0)return!0;if($.normal.dot(this.direction)*J<0)return!0;return!1}intersectBox($,J){let Q,Z,Y,V,q,U,F=1/this.direction.x,N=1/this.direction.y,L=1/this.direction.z,I=this.origin;if(F>=0)Q=($.min.x-I.x)*F,Z=($.max.x-I.x)*F;else Q=($.max.x-I.x)*F,Z=($.min.x-I.x)*F;if(N>=0)Y=($.min.y-I.y)*N,V=($.max.y-I.y)*N;else Y=($.max.y-I.y)*N,V=($.min.y-I.y)*N;if(Q>V||Y>Z)return null;if(Y>Q||isNaN(Q))Q=Y;if(V<Z||isNaN(Z))Z=V;if(L>=0)q=($.min.z-I.z)*L,U=($.max.z-I.z)*L;else q=($.max.z-I.z)*L,U=($.min.z-I.z)*L;if(Q>U||q>Z)return null;if(q>Q||Q!==Q)Q=q;if(U<Z||Z!==Z)Z=U;if(Z<0)return null;return this.at(Q>=0?Q:Z,J)}intersectsBox($){return this.intersectBox($,_8)!==null}intersectTriangle($,J,Q,Z,Y){r4.subVectors(J,$),oQ.subVectors(Q,$),t4.crossVectors(r4,oQ);let V=this.direction.dot(t4),q;if(V>0){if(Z)return null;q=1}else if(V<0)q=-1,V=-V;else return null;U5.subVectors(this.origin,$);let U=q*this.direction.dot(oQ.crossVectors(U5,oQ));if(U<0)return null;let F=q*this.direction.dot(r4.cross(U5));if(F<0)return null;if(U+F>V)return null;let N=-q*U5.dot(t4);if(N<0)return null;return this.at(N/V,Y)}applyMatrix4($){return this.origin.applyMatrix4($),this.direction.transformDirection($),this}equals($){return $.origin.equals(this.origin)&&$.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class _${constructor($,J,Q,Z,Y,V,q,U,F,N,L,I,P,C,M,A){if(_$.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],$!==void 0)this.set($,J,Q,Z,Y,V,q,U,F,N,L,I,P,C,M,A)}set($,J,Q,Z,Y,V,q,U,F,N,L,I,P,C,M,A){let R=this.elements;return R[0]=$,R[4]=J,R[8]=Q,R[12]=Z,R[1]=Y,R[5]=V,R[9]=q,R[13]=U,R[2]=F,R[6]=N,R[10]=L,R[14]=I,R[3]=P,R[7]=C,R[11]=M,R[15]=A,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new _$().fromArray(this.elements)}copy($){let J=this.elements,Q=$.elements;return J[0]=Q[0],J[1]=Q[1],J[2]=Q[2],J[3]=Q[3],J[4]=Q[4],J[5]=Q[5],J[6]=Q[6],J[7]=Q[7],J[8]=Q[8],J[9]=Q[9],J[10]=Q[10],J[11]=Q[11],J[12]=Q[12],J[13]=Q[13],J[14]=Q[14],J[15]=Q[15],this}copyPosition($){let J=this.elements,Q=$.elements;return J[12]=Q[12],J[13]=Q[13],J[14]=Q[14],this}setFromMatrix3($){let J=$.elements;return this.set(J[0],J[3],J[6],0,J[1],J[4],J[7],0,J[2],J[5],J[8],0,0,0,0,1),this}extractBasis($,J,Q){return $.setFromMatrixColumn(this,0),J.setFromMatrixColumn(this,1),Q.setFromMatrixColumn(this,2),this}makeBasis($,J,Q){return this.set($.x,J.x,Q.x,0,$.y,J.y,Q.y,0,$.z,J.z,Q.z,0,0,0,0,1),this}extractRotation($){let J=this.elements,Q=$.elements,Z=1/O6.setFromMatrixColumn($,0).length(),Y=1/O6.setFromMatrixColumn($,1).length(),V=1/O6.setFromMatrixColumn($,2).length();return J[0]=Q[0]*Z,J[1]=Q[1]*Z,J[2]=Q[2]*Z,J[3]=0,J[4]=Q[4]*Y,J[5]=Q[5]*Y,J[6]=Q[6]*Y,J[7]=0,J[8]=Q[8]*V,J[9]=Q[9]*V,J[10]=Q[10]*V,J[11]=0,J[12]=0,J[13]=0,J[14]=0,J[15]=1,this}makeRotationFromEuler($){let J=this.elements,Q=$.x,Z=$.y,Y=$.z,V=Math.cos(Q),q=Math.sin(Q),U=Math.cos(Z),F=Math.sin(Z),N=Math.cos(Y),L=Math.sin(Y);if($.order==="XYZ"){let I=V*N,P=V*L,C=q*N,M=q*L;J[0]=U*N,J[4]=-U*L,J[8]=F,J[1]=P+C*F,J[5]=I-M*F,J[9]=-q*U,J[2]=M-I*F,J[6]=C+P*F,J[10]=V*U}else if($.order==="YXZ"){let I=U*N,P=U*L,C=F*N,M=F*L;J[0]=I+M*q,J[4]=C*q-P,J[8]=V*F,J[1]=V*L,J[5]=V*N,J[9]=-q,J[2]=P*q-C,J[6]=M+I*q,J[10]=V*U}else if($.order==="ZXY"){let I=U*N,P=U*L,C=F*N,M=F*L;J[0]=I-M*q,J[4]=-V*L,J[8]=C+P*q,J[1]=P+C*q,J[5]=V*N,J[9]=M-I*q,J[2]=-V*F,J[6]=q,J[10]=V*U}else if($.order==="ZYX"){let I=V*N,P=V*L,C=q*N,M=q*L;J[0]=U*N,J[4]=C*F-P,J[8]=I*F+M,J[1]=U*L,J[5]=M*F+I,J[9]=P*F-C,J[2]=-F,J[6]=q*U,J[10]=V*U}else if($.order==="YZX"){let I=V*U,P=V*F,C=q*U,M=q*F;J[0]=U*N,J[4]=M-I*L,J[8]=C*L+P,J[1]=L,J[5]=V*N,J[9]=-q*N,J[2]=-F*N,J[6]=P*L+C,J[10]=I-M*L}else if($.order==="XZY"){let I=V*U,P=V*F,C=q*U,M=q*F;J[0]=U*N,J[4]=-L,J[8]=F*N,J[1]=I*L+M,J[5]=V*N,J[9]=P*L-C,J[2]=C*L-P,J[6]=q*N,J[10]=M*L+I}return J[3]=0,J[7]=0,J[11]=0,J[12]=0,J[13]=0,J[14]=0,J[15]=1,this}makeRotationFromQuaternion($){return this.compose(r2,$,t2)}lookAt($,J,Q){let Z=this.elements;if(N7.subVectors($,J),N7.lengthSq()===0)N7.z=1;if(N7.normalize(),q5.crossVectors(Q,N7),q5.lengthSq()===0){if(Math.abs(Q.z)===1)N7.x+=0.0001;else N7.z+=0.0001;N7.normalize(),q5.crossVectors(Q,N7)}return q5.normalize(),nQ.crossVectors(N7,q5),Z[0]=q5.x,Z[4]=nQ.x,Z[8]=N7.x,Z[1]=q5.y,Z[5]=nQ.y,Z[9]=N7.y,Z[2]=q5.z,Z[6]=nQ.z,Z[10]=N7.z,this}multiply($){return this.multiplyMatrices(this,$)}premultiply($){return this.multiplyMatrices($,this)}multiplyMatrices($,J){let Q=$.elements,Z=J.elements,Y=this.elements,V=Q[0],q=Q[4],U=Q[8],F=Q[12],N=Q[1],L=Q[5],I=Q[9],P=Q[13],C=Q[2],M=Q[6],A=Q[10],R=Q[14],E=Q[3],y=Q[7],G=Q[11],f=Q[15],d=Z[0],g=Z[4],b=Z[8],o=Z[12],_=Z[1],z=Z[5],x=Z[9],r=Z[13],e=Z[2],Q0=Z[6],J0=Z[10],K0=Z[14],F0=Z[3],U0=Z[7],C0=Z[11],x0=Z[15];return Y[0]=V*d+q*_+U*e+F*F0,Y[4]=V*g+q*z+U*Q0+F*U0,Y[8]=V*b+q*x+U*J0+F*C0,Y[12]=V*o+q*r+U*K0+F*x0,Y[1]=N*d+L*_+I*e+P*F0,Y[5]=N*g+L*z+I*Q0+P*U0,Y[9]=N*b+L*x+I*J0+P*C0,Y[13]=N*o+L*r+I*K0+P*x0,Y[2]=C*d+M*_+A*e+R*F0,Y[6]=C*g+M*z+A*Q0+R*U0,Y[10]=C*b+M*x+A*J0+R*C0,Y[14]=C*o+M*r+A*K0+R*x0,Y[3]=E*d+y*_+G*e+f*F0,Y[7]=E*g+y*z+G*Q0+f*U0,Y[11]=E*b+y*x+G*J0+f*C0,Y[15]=E*o+y*r+G*K0+f*x0,this}multiplyScalar($){let J=this.elements;return J[0]*=$,J[4]*=$,J[8]*=$,J[12]*=$,J[1]*=$,J[5]*=$,J[9]*=$,J[13]*=$,J[2]*=$,J[6]*=$,J[10]*=$,J[14]*=$,J[3]*=$,J[7]*=$,J[11]*=$,J[15]*=$,this}determinant(){let $=this.elements,J=$[0],Q=$[4],Z=$[8],Y=$[12],V=$[1],q=$[5],U=$[9],F=$[13],N=$[2],L=$[6],I=$[10],P=$[14],C=$[3],M=$[7],A=$[11],R=$[15];return C*(+Y*U*L-Z*F*L-Y*q*I+Q*F*I+Z*q*P-Q*U*P)+M*(+J*U*P-J*F*I+Y*V*I-Z*V*P+Z*F*N-Y*U*N)+A*(+J*F*L-J*q*P-Y*V*L+Q*V*P+Y*q*N-Q*F*N)+R*(-Z*q*N-J*U*L+J*q*I+Z*V*L-Q*V*I+Q*U*N)}transpose(){let $=this.elements,J;return J=$[1],$[1]=$[4],$[4]=J,J=$[2],$[2]=$[8],$[8]=J,J=$[6],$[6]=$[9],$[9]=J,J=$[3],$[3]=$[12],$[12]=J,J=$[7],$[7]=$[13],$[13]=J,J=$[11],$[11]=$[14],$[14]=J,this}setPosition($,J,Q){let Z=this.elements;if($.isVector3)Z[12]=$.x,Z[13]=$.y,Z[14]=$.z;else Z[12]=$,Z[13]=J,Z[14]=Q;return this}invert(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],Y=$[3],V=$[4],q=$[5],U=$[6],F=$[7],N=$[8],L=$[9],I=$[10],P=$[11],C=$[12],M=$[13],A=$[14],R=$[15],E=L*A*F-M*I*F+M*U*P-q*A*P-L*U*R+q*I*R,y=C*I*F-N*A*F-C*U*P+V*A*P+N*U*R-V*I*R,G=N*M*F-C*L*F+C*q*P-V*M*P-N*q*R+V*L*R,f=C*L*U-N*M*U-C*q*I+V*M*I+N*q*A-V*L*A,d=J*E+Q*y+Z*G+Y*f;if(d===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let g=1/d;return $[0]=E*g,$[1]=(M*I*Y-L*A*Y-M*Z*P+Q*A*P+L*Z*R-Q*I*R)*g,$[2]=(q*A*Y-M*U*Y+M*Z*F-Q*A*F-q*Z*R+Q*U*R)*g,$[3]=(L*U*Y-q*I*Y-L*Z*F+Q*I*F+q*Z*P-Q*U*P)*g,$[4]=y*g,$[5]=(N*A*Y-C*I*Y+C*Z*P-J*A*P-N*Z*R+J*I*R)*g,$[6]=(C*U*Y-V*A*Y-C*Z*F+J*A*F+V*Z*R-J*U*R)*g,$[7]=(V*I*Y-N*U*Y+N*Z*F-J*I*F-V*Z*P+J*U*P)*g,$[8]=G*g,$[9]=(C*L*Y-N*M*Y-C*Q*P+J*M*P+N*Q*R-J*L*R)*g,$[10]=(V*M*Y-C*q*Y+C*Q*F-J*M*F-V*Q*R+J*q*R)*g,$[11]=(N*q*Y-V*L*Y-N*Q*F+J*L*F+V*Q*P-J*q*P)*g,$[12]=f*g,$[13]=(N*M*Z-C*L*Z+C*Q*I-J*M*I-N*Q*A+J*L*A)*g,$[14]=(C*q*Z-V*M*Z-C*Q*U+J*M*U+V*Q*A-J*q*A)*g,$[15]=(V*L*Z-N*q*Z+N*Q*U-J*L*U-V*Q*I+J*q*I)*g,this}scale($){let J=this.elements,Q=$.x,Z=$.y,Y=$.z;return J[0]*=Q,J[4]*=Z,J[8]*=Y,J[1]*=Q,J[5]*=Z,J[9]*=Y,J[2]*=Q,J[6]*=Z,J[10]*=Y,J[3]*=Q,J[7]*=Z,J[11]*=Y,this}getMaxScaleOnAxis(){let $=this.elements,J=$[0]*$[0]+$[1]*$[1]+$[2]*$[2],Q=$[4]*$[4]+$[5]*$[5]+$[6]*$[6],Z=$[8]*$[8]+$[9]*$[9]+$[10]*$[10];return Math.sqrt(Math.max(J,Q,Z))}makeTranslation($,J,Q){if($.isVector3)this.set(1,0,0,$.x,0,1,0,$.y,0,0,1,$.z,0,0,0,1);else this.set(1,0,0,$,0,1,0,J,0,0,1,Q,0,0,0,1);return this}makeRotationX($){let J=Math.cos($),Q=Math.sin($);return this.set(1,0,0,0,0,J,-Q,0,0,Q,J,0,0,0,0,1),this}makeRotationY($){let J=Math.cos($),Q=Math.sin($);return this.set(J,0,Q,0,0,1,0,0,-Q,0,J,0,0,0,0,1),this}makeRotationZ($){let J=Math.cos($),Q=Math.sin($);return this.set(J,-Q,0,0,Q,J,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis($,J){let Q=Math.cos(J),Z=Math.sin(J),Y=1-Q,V=$.x,q=$.y,U=$.z,F=Y*V,N=Y*q;return this.set(F*V+Q,F*q-Z*U,F*U+Z*q,0,F*q+Z*U,N*q+Q,N*U-Z*V,0,F*U-Z*q,N*U+Z*V,Y*U*U+Q,0,0,0,0,1),this}makeScale($,J,Q){return this.set($,0,0,0,0,J,0,0,0,0,Q,0,0,0,0,1),this}makeShear($,J,Q,Z,Y,V){return this.set(1,Q,Y,0,$,1,V,0,J,Z,1,0,0,0,0,1),this}compose($,J,Q){let Z=this.elements,Y=J._x,V=J._y,q=J._z,U=J._w,F=Y+Y,N=V+V,L=q+q,I=Y*F,P=Y*N,C=Y*L,M=V*N,A=V*L,R=q*L,E=U*F,y=U*N,G=U*L,f=Q.x,d=Q.y,g=Q.z;return Z[0]=(1-(M+R))*f,Z[1]=(P+G)*f,Z[2]=(C-y)*f,Z[3]=0,Z[4]=(P-G)*d,Z[5]=(1-(I+R))*d,Z[6]=(A+E)*d,Z[7]=0,Z[8]=(C+y)*g,Z[9]=(A-E)*g,Z[10]=(1-(I+M))*g,Z[11]=0,Z[12]=$.x,Z[13]=$.y,Z[14]=$.z,Z[15]=1,this}decompose($,J,Q){let Z=this.elements,Y=O6.set(Z[0],Z[1],Z[2]).length(),V=O6.set(Z[4],Z[5],Z[6]).length(),q=O6.set(Z[8],Z[9],Z[10]).length();if(this.determinant()<0)Y=-Y;$.x=Z[12],$.y=Z[13],$.z=Z[14],i7.copy(this);let F=1/Y,N=1/V,L=1/q;return i7.elements[0]*=F,i7.elements[1]*=F,i7.elements[2]*=F,i7.elements[4]*=N,i7.elements[5]*=N,i7.elements[6]*=N,i7.elements[8]*=L,i7.elements[9]*=L,i7.elements[10]*=L,J.setFromRotationMatrix(i7),Q.x=Y,Q.y=V,Q.z=q,this}makePerspective($,J,Q,Z,Y,V,q=2000,U=!1){let F=this.elements,N=2*Y/(J-$),L=2*Y/(Q-Z),I=(J+$)/(J-$),P=(Q+Z)/(Q-Z),C,M;if(U)C=Y/(V-Y),M=V*Y/(V-Y);else if(q===2000)C=-(V+Y)/(V-Y),M=-2*V*Y/(V-Y);else if(q===2001)C=-V/(V-Y),M=-V*Y/(V-Y);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+q);return F[0]=N,F[4]=0,F[8]=I,F[12]=0,F[1]=0,F[5]=L,F[9]=P,F[13]=0,F[2]=0,F[6]=0,F[10]=C,F[14]=M,F[3]=0,F[7]=0,F[11]=-1,F[15]=0,this}makeOrthographic($,J,Q,Z,Y,V,q=2000,U=!1){let F=this.elements,N=2/(J-$),L=2/(Q-Z),I=-(J+$)/(J-$),P=-(Q+Z)/(Q-Z),C,M;if(U)C=1/(V-Y),M=V/(V-Y);else if(q===2000)C=-2/(V-Y),M=-(V+Y)/(V-Y);else if(q===2001)C=-1/(V-Y),M=-Y/(V-Y);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+q);return F[0]=N,F[4]=0,F[8]=0,F[12]=I,F[1]=0,F[5]=L,F[9]=0,F[13]=P,F[2]=0,F[6]=0,F[10]=C,F[14]=M,F[3]=0,F[7]=0,F[11]=0,F[15]=1,this}equals($){let J=this.elements,Q=$.elements;for(let Z=0;Z<16;Z++)if(J[Z]!==Q[Z])return!1;return!0}fromArray($,J=0){for(let Q=0;Q<16;Q++)this.elements[Q]=$[Q+J];return this}toArray($=[],J=0){let Q=this.elements;return $[J]=Q[0],$[J+1]=Q[1],$[J+2]=Q[2],$[J+3]=Q[3],$[J+4]=Q[4],$[J+5]=Q[5],$[J+6]=Q[6],$[J+7]=Q[7],$[J+8]=Q[8],$[J+9]=Q[9],$[J+10]=Q[10],$[J+11]=Q[11],$[J+12]=Q[12],$[J+13]=Q[13],$[J+14]=Q[14],$[J+15]=Q[15],$}}class SX{constructor(){this.mask=1}set($){this.mask=(1<<$|0)>>>0}enable($){this.mask|=1<<$|0}enableAll(){this.mask=-1}toggle($){this.mask^=1<<$|0}disable($){this.mask&=~(1<<$|0)}disableAll(){this.mask=0}test($){return(this.mask&$.mask)!==0}isEnabled($){return(this.mask&(1<<$|0))!==0}}class A7{constructor($=new s,J=new s,Q=new s){this.a=$,this.b=J,this.c=Q}static getNormal($,J,Q,Z){Z.subVectors(Q,J),a7.subVectors($,J),Z.cross(a7);let Y=Z.lengthSq();if(Y>0)return Z.multiplyScalar(1/Math.sqrt(Y));return Z.set(0,0,0)}static getBarycoord($,J,Q,Z,Y){a7.subVectors(Z,J),f8.subVectors(Q,J),$X.subVectors($,J);let V=a7.dot(a7),q=a7.dot(f8),U=a7.dot($X),F=f8.dot(f8),N=f8.dot($X),L=V*F-q*q;if(L===0)return Y.set(0,0,0),null;let I=1/L,P=(F*U-q*N)*I,C=(V*N-q*U)*I;return Y.set(1-P-C,C,P)}static containsPoint($,J,Q,Z){if(this.getBarycoord($,J,Q,Z,b8)===null)return!1;return b8.x>=0&&b8.y>=0&&b8.x+b8.y<=1}static getInterpolation($,J,Q,Z,Y,V,q,U){if(this.getBarycoord($,J,Q,Z,b8)===null){if(U.x=0,U.y=0,"z"in U)U.z=0;if("w"in U)U.w=0;return null}return U.setScalar(0),U.addScaledVector(Y,b8.x),U.addScaledVector(V,b8.y),U.addScaledVector(q,b8.z),U}static getInterpolatedAttribute($,J,Q,Z,Y,V){return XX.setScalar(0),WX.setScalar(0),YX.setScalar(0),XX.fromBufferAttribute($,J),WX.fromBufferAttribute($,Q),YX.fromBufferAttribute($,Z),V.setScalar(0),V.addScaledVector(XX,Y.x),V.addScaledVector(WX,Y.y),V.addScaledVector(YX,Y.z),V}static isFrontFacing($,J,Q,Z){return a7.subVectors(Q,J),f8.subVectors($,J),a7.cross(f8).dot(Z)<0?!0:!1}set($,J,Q){return this.a.copy($),this.b.copy(J),this.c.copy(Q),this}setFromPointsAndIndices($,J,Q,Z){return this.a.copy($[J]),this.b.copy($[Q]),this.c.copy($[Z]),this}setFromAttributeAndIndices($,J,Q,Z){return this.a.fromBufferAttribute($,J),this.b.fromBufferAttribute($,Q),this.c.fromBufferAttribute($,Z),this}clone(){return new this.constructor().copy(this)}copy($){return this.a.copy($.a),this.b.copy($.b),this.c.copy($.c),this}getArea(){return a7.subVectors(this.c,this.b),f8.subVectors(this.a,this.b),a7.cross(f8).length()*0.5}getMidpoint($){return $.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal($){return A7.getNormal(this.a,this.b,this.c,$)}getPlane($){return $.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord($,J){return A7.getBarycoord($,this.a,this.b,this.c,J)}getInterpolation($,J,Q,Z,Y){return A7.getInterpolation($,this.a,this.b,this.c,J,Q,Z,Y)}containsPoint($){return A7.containsPoint($,this.a,this.b,this.c)}isFrontFacing($){return A7.isFrontFacing(this.a,this.b,this.c,$)}intersectsBox($){return $.intersectsTriangle(this)}closestPointToPoint($,J){let Q=this.a,Z=this.b,Y=this.c,V,q;D6.subVectors(Z,Q),P6.subVectors(Y,Q),JX.subVectors($,Q);let U=D6.dot(JX),F=P6.dot(JX);if(U<=0&&F<=0)return J.copy(Q);QX.subVectors($,Z);let N=D6.dot(QX),L=P6.dot(QX);if(N>=0&&L<=N)return J.copy(Z);let I=U*L-N*F;if(I<=0&&U>=0&&N<=0)return V=U/(U-N),J.copy(Q).addScaledVector(D6,V);ZX.subVectors($,Y);let P=D6.dot(ZX),C=P6.dot(ZX);if(C>=0&&P<=C)return J.copy(Y);let M=P*F-U*C;if(M<=0&&F>=0&&C<=0)return q=F/(F-C),J.copy(Q).addScaledVector(P6,q);let A=N*C-P*L;if(A<=0&&L-N>=0&&P-C>=0)return YV.subVectors(Y,Z),q=(L-N)/(L-N+(P-C)),J.copy(Z).addScaledVector(YV,q);let R=1/(A+M+I);return V=M*R,q=I*R,J.copy(Q).addScaledVector(D6,V).addScaledVector(P6,q)}equals($){return $.a.equals(this.a)&&$.b.equals(this.b)&&$.c.equals(this.c)}}function VX($,J,Q){if(Q<0)Q+=1;if(Q>1)Q-=1;if(Q<0.16666666666666666)return $+(J-$)*6*Q;if(Q<0.5)return J;if(Q<0.6666666666666666)return $+(J-$)*6*(0.6666666666666666-Q);return $}function XF(){let $=new ArrayBuffer(4),J=new Float32Array($),Q=new Uint32Array($),Z=new Uint32Array(512),Y=new Uint32Array(512);for(let F=0;F<256;++F){let N=F-127;if(N<-27)Z[F]=0,Z[F|256]=32768,Y[F]=24,Y[F|256]=24;else if(N<-14)Z[F]=1024>>-N-14,Z[F|256]=1024>>-N-14|32768,Y[F]=-N-1,Y[F|256]=-N-1;else if(N<=15)Z[F]=N+15<<10,Z[F|256]=N+15<<10|32768,Y[F]=13,Y[F|256]=13;else if(N<128)Z[F]=31744,Z[F|256]=64512,Y[F]=24,Y[F|256]=24;else Z[F]=31744,Z[F|256]=64512,Y[F]=13,Y[F|256]=13}let V=new Uint32Array(2048),q=new Uint32Array(64),U=new Uint32Array(64);for(let F=1;F<1024;++F){let N=F<<13,L=0;while((N&8388608)===0)N<<=1,L-=8388608;N&=-8388609,L+=947912704,V[F]=N|L}for(let F=1024;F<2048;++F)V[F]=939524096+(F-1024<<13);for(let F=1;F<31;++F)q[F]=F<<23;q[31]=1199570944,q[32]=2147483648;for(let F=33;F<63;++F)q[F]=2147483648+(F-32<<23);q[63]=3347054592;for(let F=1;F<64;++F)if(F!==32)U[F]=1024;return{floatView:J,uint32View:Q,baseTable:Z,shiftTable:Y,mantissaTable:V,exponentTable:q,offsetTable:U}}function WF($){if(Math.abs($)>65504)console.warn("THREE.DataUtils.toHalfFloat(): Value out of range.");$=w$($,-65504,65504),x8.floatView[0]=$;let J=x8.uint32View[0],Q=J>>23&511;return x8.baseTable[Q]+((J&8388607)>>x8.shiftTable[Q])}function YF($){let J=$>>10;return x8.uint32View[0]=x8.mantissaTable[x8.offsetTable[J]+($&1023)]+x8.exponentTable[J],x8.floatView[0]}class VK{static toHalfFloat($){return WF($)}static fromHalfFloat($){return YF($)}}class K7{constructor($,J,Q=!1){if(Array.isArray($))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:VF++}),this.name="",this.array=$,this.itemSize=J,this.count=$!==void 0?$.length/J:0,this.normalized=Q,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate($){if($===!0)this.version++}setUsage($){return this.usage=$,this}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}copy($){return this.name=$.name,this.array=new $.array.constructor($.array),this.itemSize=$.itemSize,this.count=$.count,this.normalized=$.normalized,this.usage=$.usage,this.gpuType=$.gpuType,this}copyAt($,J,Q){$*=this.itemSize,Q*=J.itemSize;for(let Z=0,Y=this.itemSize;Z<Y;Z++)this.array[$+Z]=J.array[Q+Z];return this}copyArray($){return this.array.set($),this}applyMatrix3($){if(this.itemSize===2)for(let J=0,Q=this.count;J<Q;J++)aQ.fromBufferAttribute(this,J),aQ.applyMatrix3($),this.setXY(J,aQ.x,aQ.y);else if(this.itemSize===3)for(let J=0,Q=this.count;J<Q;J++)C9.fromBufferAttribute(this,J),C9.applyMatrix3($),this.setXYZ(J,C9.x,C9.y,C9.z);return this}applyMatrix4($){for(let J=0,Q=this.count;J<Q;J++)C9.fromBufferAttribute(this,J),C9.applyMatrix4($),this.setXYZ(J,C9.x,C9.y,C9.z);return this}applyNormalMatrix($){for(let J=0,Q=this.count;J<Q;J++)C9.fromBufferAttribute(this,J),C9.applyNormalMatrix($),this.setXYZ(J,C9.x,C9.y,C9.z);return this}transformDirection($){for(let J=0,Q=this.count;J<Q;J++)C9.fromBufferAttribute(this,J),C9.transformDirection($),this.setXYZ(J,C9.x,C9.y,C9.z);return this}set($,J=0){return this.array.set($,J),this}getComponent($,J){let Q=this.array[$*this.itemSize+J];if(this.normalized)Q=r7(Q,this.array);return Q}setComponent($,J,Q){if(this.normalized)Q=$9(Q,this.array);return this.array[$*this.itemSize+J]=Q,this}getX($){let J=this.array[$*this.itemSize];if(this.normalized)J=r7(J,this.array);return J}setX($,J){if(this.normalized)J=$9(J,this.array);return this.array[$*this.itemSize]=J,this}getY($){let J=this.array[$*this.itemSize+1];if(this.normalized)J=r7(J,this.array);return J}setY($,J){if(this.normalized)J=$9(J,this.array);return this.array[$*this.itemSize+1]=J,this}getZ($){let J=this.array[$*this.itemSize+2];if(this.normalized)J=r7(J,this.array);return J}setZ($,J){if(this.normalized)J=$9(J,this.array);return this.array[$*this.itemSize+2]=J,this}getW($){let J=this.array[$*this.itemSize+3];if(this.normalized)J=r7(J,this.array);return J}setW($,J){if(this.normalized)J=$9(J,this.array);return this.array[$*this.itemSize+3]=J,this}setXY($,J,Q){if($*=this.itemSize,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this}setXYZ($,J,Q,Z){if($*=this.itemSize,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array),Z=$9(Z,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this.array[$+2]=Z,this}setXYZW($,J,Q,Z,Y){if($*=this.itemSize,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array),Z=$9(Z,this.array),Y=$9(Y,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this.array[$+2]=Z,this.array[$+3]=Y,this}onUpload($){return this.onUploadCallback=$,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let $={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")$.name=this.name;if(this.usage!==35044)$.usage=this.usage;return $}}function UF($,J,Q,Z,Y,V,q,U){let F;if(J.side===1)F=Z.intersectTriangle(q,V,Y,!0,U);else F=Z.intersectTriangle(Y,V,q,J.side===0,U);if(F===null)return null;QZ.copy(U),QZ.applyMatrix4($.matrixWorld);let N=Q.ray.origin.distanceTo(QZ);if(N<Q.near||N>Q.far)return null;return{distance:N,point:QZ.clone(),object:$}}function ZZ($,J,Q,Z,Y,V,q,U,F,N){$.getVertexPosition(U,tQ),$.getVertexPosition(F,eQ),$.getVertexPosition(N,$Z);let L=UF($,J,Q,Z,tQ,eQ,$Z,UV);if(L){let I=new s;if(A7.getBarycoord(UV,tQ,eQ,$Z,I),Y)L.uv=A7.getInterpolatedAttribute(Y,U,F,N,I,new O$);if(V)L.uv1=A7.getInterpolatedAttribute(V,U,F,N,I,new O$);if(q){if(L.normal=A7.getInterpolatedAttribute(q,U,F,N,I,new s),L.normal.dot(Z.direction)>0)L.normal.multiplyScalar(-1)}let P={a:U,b:F,c:N,normal:new s,materialIndex:0};A7.getNormal(tQ,eQ,$Z,P.normal),L.face=P,L.barycoord=I}return L}function y6($){let J={};for(let Q in $){J[Q]={};for(let Z in $[Q]){let Y=$[Q][Z];if(Y&&(Y.isColor||Y.isMatrix3||Y.isMatrix4||Y.isVector2||Y.isVector3||Y.isVector4||Y.isTexture||Y.isQuaternion))if(Y.isRenderTargetTexture)console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),J[Q][Z]=null;else J[Q][Z]=Y.clone();else if(Array.isArray(Y))J[Q][Z]=Y.slice();else J[Q][Z]=Y}}return J}function J7($){let J={};for(let Q=0;Q<$.length;Q++){let Z=y6($[Q]);for(let Y in Z)J[Y]=Z[Y]}return J}function qF($){let J=[];for(let Q=0;Q<$.length;Q++)J.push($[Q].clone());return J}function KK($){let J=$.getRenderTarget();if(J===null)return $.outputColorSpace;if(J.isXRRenderTarget===!0)return J.texture.colorSpace;return o$.workingColorSpace}class DZ{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new k6,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new k6,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new s,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new s;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new k6,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new s,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new s;return this._grip}dispatchEvent($){if(this._targetRay!==null)this._targetRay.dispatchEvent($);if(this._grip!==null)this._grip.dispatchEvent($);if(this._hand!==null)this._hand.dispatchEvent($);return this}connect($){if($&&$.hand){let J=this._hand;if(J)for(let Q of $.hand.values())this._getHandJoint(J,Q)}return this.dispatchEvent({type:"connected",data:$}),this}disconnect($){if(this.dispatchEvent({type:"disconnected",data:$}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update($,J,Q){let Z=null,Y=null,V=null,q=this._targetRay,U=this._grip,F=this._hand;if($&&J.session.visibilityState!=="visible-blurred"){if(F&&$.hand){V=!0;for(let M of $.hand.values()){let A=J.getJointPose(M,Q),R=this._getHandJoint(F,M);if(A!==null)R.matrix.fromArray(A.transform.matrix),R.matrix.decompose(R.position,R.rotation,R.scale),R.matrixWorldNeedsUpdate=!0,R.jointRadius=A.radius;R.visible=A!==null}let N=F.joints["index-finger-tip"],L=F.joints["thumb-tip"],I=N.position.distanceTo(L.position),P=0.02,C=0.005;if(F.inputState.pinching&&I>P+C)F.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:$.handedness,target:this});else if(!F.inputState.pinching&&I<=P-C)F.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:$.handedness,target:this})}else if(U!==null&&$.gripSpace){if(Y=J.getPose($.gripSpace,Q),Y!==null){if(U.matrix.fromArray(Y.transform.matrix),U.matrix.decompose(U.position,U.rotation,U.scale),U.matrixWorldNeedsUpdate=!0,Y.linearVelocity)U.hasLinearVelocity=!0,U.linearVelocity.copy(Y.linearVelocity);else U.hasLinearVelocity=!1;if(Y.angularVelocity)U.hasAngularVelocity=!0,U.angularVelocity.copy(Y.angularVelocity);else U.hasAngularVelocity=!1}}if(q!==null){if(Z=J.getPose($.targetRaySpace,Q),Z===null&&Y!==null)Z=Y;if(Z!==null){if(q.matrix.fromArray(Z.transform.matrix),q.matrix.decompose(q.position,q.rotation,q.scale),q.matrixWorldNeedsUpdate=!0,Z.linearVelocity)q.hasLinearVelocity=!0,q.linearVelocity.copy(Z.linearVelocity);else q.hasLinearVelocity=!1;if(Z.angularVelocity)q.hasAngularVelocity=!0,q.angularVelocity.copy(Z.angularVelocity);else q.hasAngularVelocity=!1;this.dispatchEvent(NF)}}}if(q!==null)q.visible=Z!==null;if(U!==null)U.visible=Y!==null;if(F!==null)F.visible=V!==null;return this}_getHandJoint($,J){if($.joints[J.jointName]===void 0){let Q=new k6;Q.matrixAutoUpdate=!1,Q.visible=!1,$.joints[J.jointName]=Q,$.add(Q)}return $.joints[J.jointName]}}class yX{constructor($,J=1,Q=1000){this.isFog=!0,this.name="",this.color=new G$($),this.near=J,this.far=Q}clone(){return new yX(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class fX{constructor($,J){this.isInterleavedBuffer=!0,this.array=$,this.stride=J,this.count=$!==void 0?$.length/J:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=t7()}onUploadCallback(){}set needsUpdate($){if($===!0)this.version++}setUsage($){return this.usage=$,this}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}copy($){return this.array=new $.array.constructor($.array),this.count=$.count,this.stride=$.stride,this.usage=$.usage,this}copyAt($,J,Q){$*=this.stride,Q*=J.stride;for(let Z=0,Y=this.stride;Z<Y;Z++)this.array[$+Z]=J.array[Q+Z];return this}set($,J=0){return this.array.set($,J),this}clone($){if($.arrayBuffers===void 0)$.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=t7();if($.arrayBuffers[this.array.buffer._uuid]===void 0)$.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let J=new this.array.constructor($.arrayBuffers[this.array.buffer._uuid]),Q=new this.constructor(J,this.stride);return Q.setUsage(this.usage),Q}onUpload($){return this.onUploadCallback=$,this}toJSON($){if($.arrayBuffers===void 0)$.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=t7();if($.arrayBuffers[this.array.buffer._uuid]===void 0)$.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}class mJ{constructor($,J,Q,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=$,this.itemSize=J,this.offset=Q,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate($){this.data.needsUpdate=$}applyMatrix4($){for(let J=0,Q=this.data.count;J<Q;J++)$7.fromBufferAttribute(this,J),$7.applyMatrix4($),this.setXYZ(J,$7.x,$7.y,$7.z);return this}applyNormalMatrix($){for(let J=0,Q=this.count;J<Q;J++)$7.fromBufferAttribute(this,J),$7.applyNormalMatrix($),this.setXYZ(J,$7.x,$7.y,$7.z);return this}transformDirection($){for(let J=0,Q=this.count;J<Q;J++)$7.fromBufferAttribute(this,J),$7.transformDirection($),this.setXYZ(J,$7.x,$7.y,$7.z);return this}getComponent($,J){let Q=this.array[$*this.data.stride+this.offset+J];if(this.normalized)Q=r7(Q,this.array);return Q}setComponent($,J,Q){if(this.normalized)Q=$9(Q,this.array);return this.data.array[$*this.data.stride+this.offset+J]=Q,this}setX($,J){if(this.normalized)J=$9(J,this.array);return this.data.array[$*this.data.stride+this.offset]=J,this}setY($,J){if(this.normalized)J=$9(J,this.array);return this.data.array[$*this.data.stride+this.offset+1]=J,this}setZ($,J){if(this.normalized)J=$9(J,this.array);return this.data.array[$*this.data.stride+this.offset+2]=J,this}setW($,J){if(this.normalized)J=$9(J,this.array);return this.data.array[$*this.data.stride+this.offset+3]=J,this}getX($){let J=this.data.array[$*this.data.stride+this.offset];if(this.normalized)J=r7(J,this.array);return J}getY($){let J=this.data.array[$*this.data.stride+this.offset+1];if(this.normalized)J=r7(J,this.array);return J}getZ($){let J=this.data.array[$*this.data.stride+this.offset+2];if(this.normalized)J=r7(J,this.array);return J}getW($){let J=this.data.array[$*this.data.stride+this.offset+3];if(this.normalized)J=r7(J,this.array);return J}setXY($,J,Q){if($=$*this.data.stride+this.offset,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this}setXYZ($,J,Q,Z){if($=$*this.data.stride+this.offset,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array),Z=$9(Z,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this.data.array[$+2]=Z,this}setXYZW($,J,Q,Z,Y){if($=$*this.data.stride+this.offset,this.normalized)J=$9(J,this.array),Q=$9(Q,this.array),Z=$9(Z,this.array),Y=$9(Y,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this.data.array[$+2]=Z,this.data.array[$+3]=Y,this}clone($){if($===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let J=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let Y=0;Y<this.itemSize;Y++)J.push(this.data.array[Z+Y])}return new K7(new this.array.constructor(J),this.itemSize,this.normalized)}else{if($.interleavedBuffers===void 0)$.interleavedBuffers={};if($.interleavedBuffers[this.data.uuid]===void 0)$.interleavedBuffers[this.data.uuid]=this.data.clone($);return new mJ($.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON($){if($===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let J=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let Y=0;Y<this.itemSize;Y++)J.push(this.data.array[Z+Y])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:J,normalized:this.normalized}}else{if($.interleavedBuffers===void 0)$.interleavedBuffers={};if($.interleavedBuffers[this.data.uuid]===void 0)$.interleavedBuffers[this.data.uuid]=this.data.toJSON($);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}function YZ($,J,Q,Z,Y,V){if(v6.subVectors($,Q).addScalar(0.5).multiply(Z),Y!==void 0)wJ.x=V*v6.x-Y*v6.y,wJ.y=Y*v6.x+V*v6.y;else wJ.copy(v6);$.copy(J),$.x+=wJ.x,$.y+=wJ.y,$.applyMatrix4(FK)}class xX{constructor($=[],J=[]){this.uuid=t7(),this.bones=$.slice(0),this.boneInverses=J,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let $=this.bones,J=this.boneInverses;if(this.boneMatrices=new Float32Array($.length*16),J.length===0)this.calculateInverses();else if($.length!==J.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let Q=0,Z=this.bones.length;Q<Z;Q++)this.boneInverses.push(new _$)}}calculateInverses(){this.boneInverses.length=0;for(let $=0,J=this.bones.length;$<J;$++){let Q=new _$;if(this.bones[$])Q.copy(this.bones[$].matrixWorld).invert();this.boneInverses.push(Q)}}pose(){for(let $=0,J=this.bones.length;$<J;$++){let Q=this.bones[$];if(Q)Q.matrixWorld.copy(this.boneInverses[$]).invert()}for(let $=0,J=this.bones.length;$<J;$++){let Q=this.bones[$];if(Q){if(Q.parent&&Q.parent.isBone)Q.matrix.copy(Q.parent.matrixWorld).invert(),Q.matrix.multiply(Q.matrixWorld);else Q.matrix.copy(Q.matrixWorld);Q.matrix.decompose(Q.position,Q.quaternion,Q.scale)}}}update(){let $=this.bones,J=this.boneInverses,Q=this.boneMatrices,Z=this.boneTexture;for(let Y=0,V=$.length;Y<V;Y++){let q=$[Y]?$[Y].matrixWorld:LF;PV.multiplyMatrices(q,J[Y]),PV.toArray(Q,Y*16)}if(Z!==null)Z.needsUpdate=!0}clone(){return new xX(this.bones,this.boneInverses)}computeBoneTexture(){let $=Math.sqrt(this.bones.length*4);$=Math.ceil($/4)*4,$=Math.max($,4);let J=new Float32Array($*$*4);J.set(this.boneMatrices);let Q=new oJ(J,$,$,1023,1015);return Q.needsUpdate=!0,this.boneMatrices=J,this.boneTexture=Q,this}getBoneByName($){for(let J=0,Q=this.bones.length;J<Q;J++){let Z=this.bones[J];if(Z.name===$)return Z}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON($,J){this.uuid=$.uuid;for(let Q=0,Z=$.bones.length;Q<Z;Q++){let Y=$.bones[Q],V=J[Y];if(V===void 0)console.warn("THREE.Skeleton: No bone found with UUID:",Y),V=new hX;this.bones.push(V),this.boneInverses.push(new _$().fromArray($.boneInverses[Q]))}return this.init(),this}toJSON(){let $={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};$.uuid=this.uuid;let J=this.bones,Q=this.boneInverses;for(let Z=0,Y=J.length;Z<Y;Z++){let V=J[Z];$.bones.push(V.uuid);let q=Q[Z];$.boneInverses.push(q.toArray())}return $}}class B5{constructor($=new s(1,0,0),J=0){this.isPlane=!0,this.normal=$,this.constant=J}set($,J){return this.normal.copy($),this.constant=J,this}setComponents($,J,Q,Z){return this.normal.set($,J,Q),this.constant=Z,this}setFromNormalAndCoplanarPoint($,J){return this.normal.copy($),this.constant=-J.dot(this.normal),this}setFromCoplanarPoints($,J,Q){let Z=BX.subVectors(Q,J).cross(DF.subVectors($,J)).normalize();return this.setFromNormalAndCoplanarPoint(Z,$),this}copy($){return this.normal.copy($.normal),this.constant=$.constant,this}normalize(){let $=1/this.normal.length();return this.normal.multiplyScalar($),this.constant*=$,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint($){return this.normal.dot($)+this.constant}distanceToSphere($){return this.distanceToPoint($.center)-$.radius}projectPoint($,J){return J.copy($).addScaledVector(this.normal,-this.distanceToPoint($))}intersectLine($,J){let Q=$.delta(BX),Z=this.normal.dot(Q);if(Z===0){if(this.distanceToPoint($.start)===0)return J.copy($.start);return null}let Y=-($.start.dot(this.normal)+this.constant)/Z;if(Y<0||Y>1)return null;return J.copy($.start).addScaledVector(Q,Y)}intersectsLine($){let J=this.distanceToPoint($.start),Q=this.distanceToPoint($.end);return J<0&&Q>0||Q<0&&J>0}intersectsBox($){return $.intersectsPlane(this)}intersectsSphere($){return $.intersectsPlane(this)}coplanarPoint($){return $.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4($,J){let Q=J||PF.getNormalMatrix($),Z=this.coplanarPoint(BX).applyMatrix4($),Y=this.normal.applyMatrix3(Q).normalize();return this.constant=-Z.dot(Y),this}translate($){return this.constant-=$.dot(this.normal),this}equals($){return $.normal.equals(this.normal)&&$.constant===this.constant}clone(){return new this.constructor().copy(this)}}class CZ{constructor($=new B5,J=new B5,Q=new B5,Z=new B5,Y=new B5,V=new B5){this.planes=[$,J,Q,Z,Y,V]}set($,J,Q,Z,Y,V){let q=this.planes;return q[0].copy($),q[1].copy(J),q[2].copy(Q),q[3].copy(Z),q[4].copy(Y),q[5].copy(V),this}copy($){let J=this.planes;for(let Q=0;Q<6;Q++)J[Q].copy($.planes[Q]);return this}setFromProjectionMatrix($,J=2000,Q=!1){let Z=this.planes,Y=$.elements,V=Y[0],q=Y[1],U=Y[2],F=Y[3],N=Y[4],L=Y[5],I=Y[6],P=Y[7],C=Y[8],M=Y[9],A=Y[10],R=Y[11],E=Y[12],y=Y[13],G=Y[14],f=Y[15];if(Z[0].setComponents(F-V,P-N,R-C,f-E).normalize(),Z[1].setComponents(F+V,P+N,R+C,f+E).normalize(),Z[2].setComponents(F+q,P+L,R+M,f+y).normalize(),Z[3].setComponents(F-q,P-L,R-M,f-y).normalize(),Q)Z[4].setComponents(U,I,A,G).normalize(),Z[5].setComponents(F-U,P-I,R-A,f-G).normalize();else if(Z[4].setComponents(F-U,P-I,R-A,f-G).normalize(),J===2000)Z[5].setComponents(F+U,P+I,R+A,f+G).normalize();else if(J===2001)Z[5].setComponents(U,I,A,G).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+J);return this}intersectsObject($){if($.boundingSphere!==void 0){if($.boundingSphere===null)$.computeBoundingSphere();x5.copy($.boundingSphere).applyMatrix4($.matrixWorld)}else{let J=$.geometry;if(J.boundingSphere===null)J.computeBoundingSphere();x5.copy(J.boundingSphere).applyMatrix4($.matrixWorld)}return this.intersectsSphere(x5)}intersectsSprite($){x5.center.set(0,0,0);let J=GF.distanceTo($.center);return x5.radius=0.7071067811865476+J,x5.applyMatrix4($.matrixWorld),this.intersectsSphere(x5)}intersectsSphere($){let J=this.planes,Q=$.center,Z=-$.radius;for(let Y=0;Y<6;Y++)if(J[Y].distanceToPoint(Q)<Z)return!1;return!0}intersectsBox($){let J=this.planes;for(let Q=0;Q<6;Q++){let Z=J[Q];if(UZ.x=Z.normal.x>0?$.max.x:$.min.x,UZ.y=Z.normal.y>0?$.max.y:$.min.y,UZ.z=Z.normal.z>0?$.max.z:$.min.z,Z.distanceToPoint(UZ)<0)return!1}return!0}containsPoint($){let J=this.planes;for(let Q=0;Q<6;Q++)if(J[Q].distanceToPoint($)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function HZ($,J,Q,Z,Y,V,q){let U=$.geometry.attributes.position;if(GZ.fromBufferAttribute(U,Y),EZ.fromBufferAttribute(U,V),Q.distanceSqToSegment(GZ,EZ,NX,jV)>Z)return;NX.applyMatrix4($.matrixWorld);let N=J.ray.origin.distanceTo(NX);if(N<J.near||N>J.far)return;return{distance:N,point:jV.clone().applyMatrix4($.matrixWorld),index:q,face:null,faceIndex:null,barycoord:null,object:$}}function AV($,J,Q,Z,Y,V,q){let U=CX.distanceSqToPoint($);if(U<Q){let F=new s;CX.closestPointToPoint($,F),F.applyMatrix4(Z);let N=Y.ray.origin.distanceTo(F);if(N<Y.near||N>Y.far)return;V.push({distance:N,distanceToRay:Math.sqrt(U),point:F,index:J,face:null,faceIndex:null,barycoord:null,object:q})}}function NZ($,J){if(!$||$.constructor===J)return $;if(typeof J.BYTES_PER_ELEMENT==="number")return new J($);return Array.prototype.slice.call($)}function EF($){return ArrayBuffer.isView($)&&!($ instanceof DataView)}function RF($){function J(Y,V){return $[Y]-$[V]}let Q=$.length,Z=Array(Q);for(let Y=0;Y!==Q;++Y)Z[Y]=Y;return Z.sort(J),Z}function TV($,J,Q){let Z=$.length,Y=new $.constructor(Z);for(let V=0,q=0;q!==Z;++V){let U=Q[V]*J;for(let F=0;F!==J;++F)Y[q++]=$[U+F]}return Y}function MK($,J,Q,Z){let Y=1,V=$[0];while(V!==void 0&&V[Z]===void 0)V=$[Y++];if(V===void 0)return;let q=V[Z];if(q===void 0)return;if(Array.isArray(q))do{if(q=V[Z],q!==void 0)J.push(V.time),Q.push(...q);V=$[Y++]}while(V!==void 0);else if(q.toArray!==void 0)do{if(q=V[Z],q!==void 0)J.push(V.time),q.toArray(Q,Q.length);V=$[Y++]}while(V!==void 0);else do{if(q=V[Z],q!==void 0)J.push(V.time),Q.push(q);V=$[Y++]}while(V!==void 0)}class x6{constructor($,J,Q,Z){this.parameterPositions=$,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new J.constructor(Q),this.sampleValues=J,this.valueSize=Q,this.settings=null,this.DefaultSettings_={}}evaluate($){let J=this.parameterPositions,Q=this._cachedIndex,Z=J[Q],Y=J[Q-1];Q:{$:{let V;J:{Z:if(!($<Z)){for(let q=Q+2;;){if(Z===void 0){if($<Y)break Z;return Q=J.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}if(Q===q)break;if(Y=Z,Z=J[++Q],$<Z)break $}V=J.length;break J}if(!($>=Y)){let q=J[1];if($<q)Q=2,Y=q;for(let U=Q-2;;){if(Y===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Q===U)break;if(Z=Y,Y=J[--Q-1],$>=Y)break $}V=Q,Q=0;break J}break Q}while(Q<V){let q=Q+V>>>1;if($<J[q])V=q;else Q=q+1}if(Z=J[Q],Y=J[Q-1],Y===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return Q=J.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}this._cachedIndex=Q,this.intervalChanged_(Q,Y,Z)}return this.interpolate_(Q,Y,$,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_($){let J=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,Y=$*Z;for(let V=0;V!==Z;++V)J[V]=Q[Y+V];return J}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class S7{constructor($,J,Q,Z){if($===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(J===void 0||J.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+$);this.name=$,this.times=NZ(J,this.TimeBufferType),this.values=NZ(Q,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON($){let J=$.constructor,Q;if(J.toJSON!==this.toJSON)Q=J.toJSON($);else{Q={name:$.name,times:NZ($.times,Array),values:NZ($.values,Array)};let Z=$.getInterpolation();if(Z!==$.DefaultInterpolation)Q.interpolation=Z}return Q.type=$.ValueTypeName,Q}InterpolantFactoryMethodDiscrete($){return new TK(this.times,this.values,this.getValueSize(),$)}InterpolantFactoryMethodLinear($){return new AK(this.times,this.values,this.getValueSize(),$)}InterpolantFactoryMethodSmooth($){return new vK(this.times,this.values,this.getValueSize(),$)}setInterpolation($){let J;switch($){case 2300:J=this.InterpolantFactoryMethodDiscrete;break;case 2301:J=this.InterpolantFactoryMethodLinear;break;case 2302:J=this.InterpolantFactoryMethodSmooth;break}if(J===void 0){let Q="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if($!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(Q);return console.warn("THREE.KeyframeTrack:",Q),this}return this.createInterpolant=J,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302}}getValueSize(){return this.values.length/this.times.length}shift($){if($!==0){let J=this.times;for(let Q=0,Z=J.length;Q!==Z;++Q)J[Q]+=$}return this}scale($){if($!==1){let J=this.times;for(let Q=0,Z=J.length;Q!==Z;++Q)J[Q]*=$}return this}trim($,J){let Q=this.times,Z=Q.length,Y=0,V=Z-1;while(Y!==Z&&Q[Y]<$)++Y;while(V!==-1&&Q[V]>J)--V;if(++V,Y!==0||V!==Z){if(Y>=V)V=Math.max(V,1),Y=V-1;let q=this.getValueSize();this.times=Q.slice(Y,V),this.values=this.values.slice(Y*q,V*q)}return this}validate(){let $=!0,J=this.getValueSize();if(J-Math.floor(J)!==0)console.error("THREE.KeyframeTrack: Invalid value size in track.",this),$=!1;let Q=this.times,Z=this.values,Y=Q.length;if(Y===0)console.error("THREE.KeyframeTrack: Track is empty.",this),$=!1;let V=null;for(let q=0;q!==Y;q++){let U=Q[q];if(typeof U==="number"&&isNaN(U)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,q,U),$=!1;break}if(V!==null&&V>U){console.error("THREE.KeyframeTrack: Out of order keys.",this,q,U,V),$=!1;break}V=U}if(Z!==void 0){if(EF(Z))for(let q=0,U=Z.length;q!==U;++q){let F=Z[q];if(isNaN(F)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,q,F),$=!1;break}}}return $}optimize(){let $=this.times.slice(),J=this.values.slice(),Q=this.getValueSize(),Z=this.getInterpolation()===2302,Y=$.length-1,V=1;for(let q=1;q<Y;++q){let U=!1,F=$[q],N=$[q+1];if(F!==N&&(q!==1||F!==$[0]))if(!Z){let L=q*Q,I=L-Q,P=L+Q;for(let C=0;C!==Q;++C){let M=J[L+C];if(M!==J[I+C]||M!==J[P+C]){U=!0;break}}}else U=!0;if(U){if(q!==V){$[V]=$[q];let L=q*Q,I=V*Q;for(let P=0;P!==Q;++P)J[I+P]=J[L+P]}++V}}if(Y>0){$[V]=$[Y];for(let q=Y*Q,U=V*Q,F=0;F!==Q;++F)J[U+F]=J[q+F];++V}if(V!==$.length)this.times=$.slice(0,V),this.values=J.slice(0,V*Q);else this.times=$,this.values=J;return this}clone(){let $=this.times.slice(),J=this.values.slice(),Z=new this.constructor(this.name,$,J);return Z.createInterpolant=this.createInterpolant,Z}}class kK{constructor($="",J=-1,Q=[],Z=2500){if(this.name=$,this.tracks=Q,this.duration=J,this.blendMode=Z,this.uuid=t7(),this.userData={},this.duration<0)this.resetDuration()}static parse($){let J=[],Q=$.tracks,Z=1/($.fps||1);for(let V=0,q=Q.length;V!==q;++V)J.push(CF(Q[V]).scale(Z));let Y=new this($.name,$.duration,J,$.blendMode);return Y.uuid=$.uuid,Y.userData=JSON.parse($.userData||"{}"),Y}static toJSON($){let J=[],Q=$.tracks,Z={name:$.name,duration:$.duration,tracks:J,uuid:$.uuid,blendMode:$.blendMode,userData:JSON.stringify($.userData)};for(let Y=0,V=Q.length;Y!==V;++Y)J.push(S7.toJSON(Q[Y]));return Z}static CreateFromMorphTargetSequence($,J,Q,Z){let Y=J.length,V=[];for(let q=0;q<Y;q++){let U=[],F=[];U.push((q+Y-1)%Y,q,(q+1)%Y),F.push(0,1,0);let N=RF(U);if(U=TV(U,1,N),F=TV(F,1,N),!Z&&U[0]===0)U.push(Y),F.push(F[0]);V.push(new f6(".morphTargetInfluences["+J[q].name+"]",U,F).scale(1/Q))}return new this($,-1,V)}static findByName($,J){let Q=$;if(!Array.isArray($)){let Z=$;Q=Z.geometry&&Z.geometry.animations||Z.animations}for(let Z=0;Z<Q.length;Z++)if(Q[Z].name===J)return Q[Z];return null}static CreateClipsFromMorphTargetSequences($,J,Q){let Z={},Y=/^([\w-]*?)([\d]+)$/;for(let q=0,U=$.length;q<U;q++){let F=$[q],N=F.name.match(Y);if(N&&N.length>1){let L=N[1],I=Z[L];if(!I)Z[L]=I=[];I.push(F)}}let V=[];for(let q in Z)V.push(this.CreateFromMorphTargetSequence(q,Z[q],J,Q));return V}static parseAnimation($,J){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!$)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;let Q=function(L,I,P,C,M){if(P.length!==0){let A=[],R=[];if(MK(P,A,R,C),A.length!==0)M.push(new L(I,A,R))}},Z=[],Y=$.name||"default",V=$.fps||30,q=$.blendMode,U=$.length||-1,F=$.hierarchy||[];for(let L=0;L<F.length;L++){let I=F[L].keys;if(!I||I.length===0)continue;if(I[0].morphTargets){let P={},C;for(C=0;C<I.length;C++)if(I[C].morphTargets)for(let M=0;M<I[C].morphTargets.length;M++)P[I[C].morphTargets[M]]=-1;for(let M in P){let A=[],R=[];for(let E=0;E!==I[C].morphTargets.length;++E){let y=I[C];A.push(y.time),R.push(y.morphTarget===M?1:0)}Z.push(new f6(".morphTargetInfluence["+M+"]",A,R))}U=P.length*V}else{let P=".bones["+J[L].name+"]";Q(b6,P+".position",I,"pos",Z),Q(g6,P+".quaternion",I,"rot",Z),Q(b6,P+".scale",I,"scl",Z)}}if(Z.length===0)return null;return new this(Y,U,Z,q)}resetDuration(){let $=this.tracks,J=0;for(let Q=0,Z=$.length;Q!==Z;++Q){let Y=this.tracks[Q];J=Math.max(J,Y.times[Y.times.length-1])}return this.duration=J,this}trim(){for(let $=0;$<this.tracks.length;$++)this.tracks[$].trim(0,this.duration);return this}validate(){let $=!0;for(let J=0;J<this.tracks.length;J++)$=$&&this.tracks[J].validate();return $}optimize(){for(let $=0;$<this.tracks.length;$++)this.tracks[$].optimize();return this}clone(){let $=[];for(let Q=0;Q<this.tracks.length;Q++)$.push(this.tracks[Q].clone());let J=new this.constructor(this.name,this.duration,$,this.blendMode);return J.userData=JSON.parse(JSON.stringify(this.userData)),J}toJSON(){return this.constructor.toJSON(this)}}function jF($){switch($.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return f6;case"vector":case"vector2":case"vector3":case"vector4":return b6;case"color":return aX;case"quaternion":return g6;case"bool":case"boolean":return m5;case"string":return c5}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+$)}function CF($){if($.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let J=jF($.type);if($.times===void 0){let Q=[],Z=[];MK($.keys,Q,Z,"value"),$.times=Q,$.values=Z}if(J.parse!==void 0)return J.parse($);else return new J($.name,$.times,$.values,$.interpolation)}class zK{constructor($,J,Q){let Z=this,Y=!1,V=0,q=0,U=void 0,F=[];this.onStart=void 0,this.onLoad=$,this.onProgress=J,this.onError=Q,this.abortController=new AbortController,this.itemStart=function(N){if(q++,Y===!1){if(Z.onStart!==void 0)Z.onStart(N,V,q)}Y=!0},this.itemEnd=function(N){if(V++,Z.onProgress!==void 0)Z.onProgress(N,V,q);if(V===q){if(Y=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(N){if(Z.onError!==void 0)Z.onError(N)},this.resolveURL=function(N){if(U)return U(N);return N},this.setURLModifier=function(N){return U=N,this},this.addHandler=function(N,L){return F.push(N,L),this},this.removeHandler=function(N){let L=F.indexOf(N);if(L!==-1)F.splice(L,2);return this},this.getHandler=function(N){for(let L=0,I=F.length;L<I;L+=2){let P=F[L],C=F[L+1];if(P.global)P.lastIndex=0;if(P.test(N))return C}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}class O5{constructor($){this.manager=$!==void 0?$:MF,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync($,J){let Q=this;return new Promise(function(Z,Y){Q.load($,Z,J,Y)})}parse(){}setCrossOrigin($){return this.crossOrigin=$,this}setWithCredentials($){return this.withCredentials=$,this}setPath($){return this.path=$,this}setResourcePath($){return this.resourcePath=$,this}setRequestHeader($){return this.requestHeader=$,this}abort(){return this}}class AZ{constructor($){this.camera=$,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new O$(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new _$,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new CZ,this._frameExtents=new O$(1,1),this._viewportCount=1,this._viewports=[new a$(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices($){let J=this.camera,Q=this.matrix;if(SV.setFromMatrixPosition($.matrixWorld),J.position.copy(SV),kV.setFromMatrixPosition($.target.matrixWorld),J.lookAt(kV),J.updateMatrixWorld(),OX.multiplyMatrices(J.projectionMatrix,J.matrixWorldInverse),this._frustum.setFromProjectionMatrix(OX,J.coordinateSystem,J.reversedDepth),J.reversedDepth)Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,1,0,0,0,0,1);else Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);Q.multiply(OX)}getViewport($){return this._viewports[$]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy($){return this.camera=$.camera.clone(),this.intensity=$.intensity,this.bias=$.bias,this.radius=$.radius,this.autoUpdate=$.autoUpdate,this.needsUpdate=$.needsUpdate,this.normalBias=$.normalBias,this.blurSamples=$.blurSamples,this.mapSize.copy($.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let $={};if(this.intensity!==1)$.intensity=this.intensity;if(this.bias!==0)$.bias=this.bias;if(this.normalBias!==0)$.normalBias=this.normalBias;if(this.radius!==1)$.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)$.mapSize=this.mapSize.toArray();return $.camera=this.camera.toJSON(!1).object,delete $.camera.matrix,$}}class dK{static extractUrlBase($){let J=$.lastIndexOf("/");if(J===-1)return"./";return $.slice(0,J+1)}static resolveURL($,J){if(typeof $!=="string"||$==="")return"";if(/^https?:\/\//i.test(J)&&/^\//.test($))J=J.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test($))return $;if(/^data:.*,.*$/i.test($))return $;if(/^blob:.*$/i.test($))return $;return J+$}}class nK{constructor($,J,Q){let Z=Q||J9.parseTrackName(J);this._targetGroup=$,this._bindings=$.subscribe_(J,Z)}getValue($,J){this.bind();let Q=this._targetGroup.nCachedObjects_,Z=this._bindings[Q];if(Z!==void 0)Z.getValue($,J)}setValue($,J){let Q=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,Y=Q.length;Z!==Y;++Z)Q[Z].setValue($,J)}bind(){let $=this._bindings;for(let J=this._targetGroup.nCachedObjects_,Q=$.length;J!==Q;++J)$[J].bind()}unbind(){let $=this._bindings;for(let J=this._targetGroup.nCachedObjects_,Q=$.length;J!==Q;++J)$[J].unbind()}}class J9{constructor($,J,Q){this.path=J,this.parsedPath=Q||J9.parseTrackName(J),this.node=J9.findNode($,this.parsedPath.nodeName),this.rootNode=$,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create($,J,Q){if(!($&&$.isAnimationObjectGroup))return new J9($,J,Q);else return new J9.Composite($,J,Q)}static sanitizeNodeName($){return $.replace(/\s/g,"_").replace(vF,"")}static parseTrackName($){let J=wF.exec($);if(J===null)throw Error("PropertyBinding: Cannot parse trackName: "+$);let Q={nodeName:J[2],objectName:J[3],objectIndex:J[4],propertyName:J[5],propertyIndex:J[6]},Z=Q.nodeName&&Q.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let Y=Q.nodeName.substring(Z+1);if(_F.indexOf(Y)!==-1)Q.nodeName=Q.nodeName.substring(0,Z),Q.objectName=Y}if(Q.propertyName===null||Q.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+$);return Q}static findNode($,J){if(J===void 0||J===""||J==="."||J===-1||J===$.name||J===$.uuid)return $;if($.skeleton){let Q=$.skeleton.getBoneByName(J);if(Q!==void 0)return Q}if($.children){let Q=function(Y){for(let V=0;V<Y.length;V++){let q=Y[V];if(q.name===J||q.uuid===J)return q;let U=Q(q.children);if(U)return U}return null},Z=Q($.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct($,J){$[J]=this.targetObject[this.propertyName]}_getValue_array($,J){let Q=this.resolvedProperty;for(let Z=0,Y=Q.length;Z!==Y;++Z)$[J++]=Q[Z]}_getValue_arrayElement($,J){$[J]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray($,J){this.resolvedProperty.toArray($,J)}_setValue_direct($,J){this.targetObject[this.propertyName]=$[J]}_setValue_direct_setNeedsUpdate($,J){this.targetObject[this.propertyName]=$[J],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate($,J){this.targetObject[this.propertyName]=$[J],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array($,J){let Q=this.resolvedProperty;for(let Z=0,Y=Q.length;Z!==Y;++Z)Q[Z]=$[J++]}_setValue_array_setNeedsUpdate($,J){let Q=this.resolvedProperty;for(let Z=0,Y=Q.length;Z!==Y;++Z)Q[Z]=$[J++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate($,J){let Q=this.resolvedProperty;for(let Z=0,Y=Q.length;Z!==Y;++Z)Q[Z]=$[J++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement($,J){this.resolvedProperty[this.propertyIndex]=$[J]}_setValue_arrayElement_setNeedsUpdate($,J){this.resolvedProperty[this.propertyIndex]=$[J],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate($,J){this.resolvedProperty[this.propertyIndex]=$[J],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray($,J){this.resolvedProperty.fromArray($,J)}_setValue_fromArray_setNeedsUpdate($,J){this.resolvedProperty.fromArray($,J),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate($,J){this.resolvedProperty.fromArray($,J),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound($,J){this.bind(),this.getValue($,J)}_setValue_unbound($,J){this.bind(),this.setValue($,J)}bind(){let $=this.node,J=this.parsedPath,Q=J.objectName,Z=J.propertyName,Y=J.propertyIndex;if(!$)$=J9.findNode(this.rootNode,J.nodeName),this.node=$;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!$){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(Q){let F=J.objectIndex;switch(Q){case"materials":if(!$.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!$.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}$=$.material.materials;break;case"bones":if(!$.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}$=$.skeleton.bones;for(let N=0;N<$.length;N++)if($[N].name===F){F=N;break}break;case"map":if("map"in $){$=$.map;break}if(!$.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!$.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}$=$.material.map;break;default:if($[Q]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}$=$[Q]}if(F!==void 0){if($[F]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,$);return}$=$[F]}}let V=$[Z];if(V===void 0){let F=J.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+F+"."+Z+" but it wasn't found.",$);return}let q=this.Versioning.None;if(this.targetObject=$,$.isMaterial===!0)q=this.Versioning.NeedsUpdate;else if($.isObject3D===!0)q=this.Versioning.MatrixWorldNeedsUpdate;let U=this.BindingType.Direct;if(Y!==void 0){if(Z==="morphTargetInfluences"){if(!$.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!$.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if($.morphTargetDictionary[Y]!==void 0)Y=$.morphTargetDictionary[Y]}U=this.BindingType.ArrayElement,this.resolvedProperty=V,this.propertyIndex=Y}else if(V.fromArray!==void 0&&V.toArray!==void 0)U=this.BindingType.HasFromToArray,this.resolvedProperty=V;else if(Array.isArray(V))U=this.BindingType.EntireArray,this.resolvedProperty=V;else this.propertyName=Z;this.getValue=this.GetterByBindingType[U],this.setValue=this.SetterByBindingTypeAndVersioning[U][q]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}function wV($,J,Q,Z){let Y=yF(Z);switch(Q){case 1021:return $*J;case 1028:return $*J/Y.components*Y.byteLength;case 1029:return $*J/Y.components*Y.byteLength;case 1030:return $*J*2/Y.components*Y.byteLength;case 1031:return $*J*2/Y.components*Y.byteLength;case 1022:return $*J*3/Y.components*Y.byteLength;case 1023:return $*J*4/Y.components*Y.byteLength;case 1033:return $*J*4/Y.components*Y.byteLength;case 33776:case 33777:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*8;case 33778:case 33779:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 35841:case 35843:return Math.max($,16)*Math.max(J,8)/4;case 35840:case 35842:return Math.max($,8)*Math.max(J,8)/2;case 36196:case 37492:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*8;case 37496:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 37808:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 37809:return Math.floor(($+4)/5)*Math.floor((J+3)/4)*16;case 37810:return Math.floor(($+4)/5)*Math.floor((J+4)/5)*16;case 37811:return Math.floor(($+5)/6)*Math.floor((J+4)/5)*16;case 37812:return Math.floor(($+5)/6)*Math.floor((J+5)/6)*16;case 37813:return Math.floor(($+7)/8)*Math.floor((J+4)/5)*16;case 37814:return Math.floor(($+7)/8)*Math.floor((J+5)/6)*16;case 37815:return Math.floor(($+7)/8)*Math.floor((J+7)/8)*16;case 37816:return Math.floor(($+9)/10)*Math.floor((J+4)/5)*16;case 37817:return Math.floor(($+9)/10)*Math.floor((J+5)/6)*16;case 37818:return Math.floor(($+9)/10)*Math.floor((J+7)/8)*16;case 37819:return Math.floor(($+9)/10)*Math.floor((J+9)/10)*16;case 37820:return Math.floor(($+11)/12)*Math.floor((J+9)/10)*16;case 37821:return Math.floor(($+11)/12)*Math.floor((J+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil($/4)*Math.ceil(J/4)*16;case 36283:case 36284:return Math.ceil($/4)*Math.ceil(J/4)*8;case 36285:case 36286:return Math.ceil($/4)*Math.ceil(J/4)*16}throw Error(`Unable to determine texture byte length for ${Q} format.`)}function yF($){switch($){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${$}.`)}function sK(){let $=null,J=!1,Q=null,Z=null;function Y(V,q){Q(V,q),Z=$.requestAnimationFrame(Y)}return{start:function(){if(J===!0)return;if(Q===null)return;Z=$.requestAnimationFrame(Y),J=!0},stop:function(){$.cancelAnimationFrame(Z),J=!1},setAnimationLoop:function(V){Q=V},setContext:function(V){$=V}}}function fF($){let J=new WeakMap;function Q(U,F){let{array:N,usage:L}=U,I=N.byteLength,P=$.createBuffer();$.bindBuffer(F,P),$.bufferData(F,N,L),U.onUploadCallback();let C;if(N instanceof Float32Array)C=$.FLOAT;else if(typeof Float16Array<"u"&&N instanceof Float16Array)C=$.HALF_FLOAT;else if(N instanceof Uint16Array)if(U.isFloat16BufferAttribute)C=$.HALF_FLOAT;else C=$.UNSIGNED_SHORT;else if(N instanceof Int16Array)C=$.SHORT;else if(N instanceof Uint32Array)C=$.UNSIGNED_INT;else if(N instanceof Int32Array)C=$.INT;else if(N instanceof Int8Array)C=$.BYTE;else if(N instanceof Uint8Array)C=$.UNSIGNED_BYTE;else if(N instanceof Uint8ClampedArray)C=$.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+N);return{buffer:P,type:C,bytesPerElement:N.BYTES_PER_ELEMENT,version:U.version,size:I}}function Z(U,F,N){let{array:L,updateRanges:I}=F;if($.bindBuffer(N,U),I.length===0)$.bufferSubData(N,0,L);else{I.sort((C,M)=>C.start-M.start);let P=0;for(let C=1;C<I.length;C++){let M=I[P],A=I[C];if(A.start<=M.start+M.count+1)M.count=Math.max(M.count,A.start+A.count-M.start);else++P,I[P]=A}I.length=P+1;for(let C=0,M=I.length;C<M;C++){let A=I[C];$.bufferSubData(N,A.start*L.BYTES_PER_ELEMENT,L,A.start,A.count)}F.clearUpdateRanges()}F.onUploadCallback()}function Y(U){if(U.isInterleavedBufferAttribute)U=U.data;return J.get(U)}function V(U){if(U.isInterleavedBufferAttribute)U=U.data;let F=J.get(U);if(F)$.deleteBuffer(F.buffer),J.delete(U)}function q(U,F){if(U.isInterleavedBufferAttribute)U=U.data;if(U.isGLBufferAttribute){let L=J.get(U);if(!L||L.version<U.version)J.set(U,{buffer:U.buffer,type:U.type,bytesPerElement:U.elementSize,version:U.version});return}let N=J.get(U);if(N===void 0)J.set(U,Q(U,F));else if(N.version<U.version){if(N.size!==U.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(N.buffer,U,F),N.version=U.version}}return{get:Y,remove:V,update:q}}function L3($,J,Q,Z,Y,V,q){let U=new G$(0),F=V===!0?0:1,N,L,I=null,P=0,C=null;function M(G){let f=G.isScene===!0?G.background:null;if(f&&f.isTexture)f=(G.backgroundBlurriness>0?Q:J).get(f);return f}function A(G){let f=!1,d=M(G);if(d===null)E(U,F);else if(d&&d.isColor)E(d,1),f=!0;let g=$.xr.getEnvironmentBlendMode();if(g==="additive")Z.buffers.color.setClear(0,0,0,1,q);else if(g==="alpha-blend")Z.buffers.color.setClear(0,0,0,0,q);if($.autoClear||f)Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),$.clear($.autoClearColor,$.autoClearDepth,$.autoClearStencil)}function R(G,f){let d=M(f);if(d&&(d.isCubeTexture||d.mapping===306)){if(L===void 0)L=new V7(new h6(1,1,1),new N8({name:"BackgroundCubeMaterial",uniforms:y6(B8.backgroundCube.uniforms),vertexShader:B8.backgroundCube.vertexShader,fragmentShader:B8.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),L.geometry.deleteAttribute("normal"),L.geometry.deleteAttribute("uv"),L.onBeforeRender=function(g,b,o){this.matrixWorld.copyPosition(o.matrixWorld)},Object.defineProperty(L.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),Y.update(L);if(g5.copy(f.backgroundRotation),g5.x*=-1,g5.y*=-1,g5.z*=-1,d.isCubeTexture&&d.isRenderTargetTexture===!1)g5.y*=-1,g5.z*=-1;if(L.material.uniforms.envMap.value=d,L.material.uniforms.flipEnvMap.value=d.isCubeTexture&&d.isRenderTargetTexture===!1?-1:1,L.material.uniforms.backgroundBlurriness.value=f.backgroundBlurriness,L.material.uniforms.backgroundIntensity.value=f.backgroundIntensity,L.material.uniforms.backgroundRotation.value.setFromMatrix4(O3.makeRotationFromEuler(g5)),L.material.toneMapped=o$.getTransfer(d.colorSpace)!=="srgb",I!==d||P!==d.version||C!==$.toneMapping)L.material.needsUpdate=!0,I=d,P=d.version,C=$.toneMapping;L.layers.enableAll(),G.unshift(L,L.geometry,L.material,0,0,null)}else if(d&&d.isTexture){if(N===void 0)N=new V7(new nJ(2,2),new N8({name:"BackgroundMaterial",uniforms:y6(B8.background.uniforms),vertexShader:B8.background.vertexShader,fragmentShader:B8.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),N.geometry.deleteAttribute("normal"),Object.defineProperty(N.material,"map",{get:function(){return this.uniforms.t2D.value}}),Y.update(N);if(N.material.uniforms.t2D.value=d,N.material.uniforms.backgroundIntensity.value=f.backgroundIntensity,N.material.toneMapped=o$.getTransfer(d.colorSpace)!=="srgb",d.matrixAutoUpdate===!0)d.updateMatrix();if(N.material.uniforms.uvTransform.value.copy(d.matrix),I!==d||P!==d.version||C!==$.toneMapping)N.material.needsUpdate=!0,I=d,P=d.version,C=$.toneMapping;N.layers.enableAll(),G.unshift(N,N.geometry,N.material,0,0,null)}}function E(G,f){G.getRGB(OZ,KK($)),Z.buffers.color.setClear(OZ.r,OZ.g,OZ.b,f,q)}function y(){if(L!==void 0)L.geometry.dispose(),L.material.dispose(),L=void 0;if(N!==void 0)N.geometry.dispose(),N.material.dispose(),N=void 0}return{getClearColor:function(){return U},setClearColor:function(G,f=1){U.set(G),F=f,E(U,F)},getClearAlpha:function(){return F},setClearAlpha:function(G){F=G,E(U,F)},render:A,addToRenderList:R,dispose:y}}function I3($,J){let Q=$.getParameter($.MAX_VERTEX_ATTRIBS),Z={},Y=P(null),V=Y,q=!1;function U(z,x,r,e,Q0){let J0=!1,K0=I(e,r,x);if(V!==K0)V=K0,N(V.object);if(J0=C(z,e,r,Q0),J0)M(z,e,r,Q0);if(Q0!==null)J.update(Q0,$.ELEMENT_ARRAY_BUFFER);if(J0||q){if(q=!1,f(z,x,r,e),Q0!==null)$.bindBuffer($.ELEMENT_ARRAY_BUFFER,J.get(Q0).buffer)}}function F(){return $.createVertexArray()}function N(z){return $.bindVertexArray(z)}function L(z){return $.deleteVertexArray(z)}function I(z,x,r){let e=r.wireframe===!0,Q0=Z[z.id];if(Q0===void 0)Q0={},Z[z.id]=Q0;let J0=Q0[x.id];if(J0===void 0)J0={},Q0[x.id]=J0;let K0=J0[e];if(K0===void 0)K0=P(F()),J0[e]=K0;return K0}function P(z){let x=[],r=[],e=[];for(let Q0=0;Q0<Q;Q0++)x[Q0]=0,r[Q0]=0,e[Q0]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:x,enabledAttributes:r,attributeDivisors:e,object:z,attributes:{},index:null}}function C(z,x,r,e){let Q0=V.attributes,J0=x.attributes,K0=0,F0=r.getAttributes();for(let U0 in F0)if(F0[U0].location>=0){let x0=Q0[U0],e0=J0[U0];if(e0===void 0){if(U0==="instanceMatrix"&&z.instanceMatrix)e0=z.instanceMatrix;if(U0==="instanceColor"&&z.instanceColor)e0=z.instanceColor}if(x0===void 0)return!0;if(x0.attribute!==e0)return!0;if(e0&&x0.data!==e0.data)return!0;K0++}if(V.attributesNum!==K0)return!0;if(V.index!==e)return!0;return!1}function M(z,x,r,e){let Q0={},J0=x.attributes,K0=0,F0=r.getAttributes();for(let U0 in F0)if(F0[U0].location>=0){let x0=J0[U0];if(x0===void 0){if(U0==="instanceMatrix"&&z.instanceMatrix)x0=z.instanceMatrix;if(U0==="instanceColor"&&z.instanceColor)x0=z.instanceColor}let e0={};if(e0.attribute=x0,x0&&x0.data)e0.data=x0.data;Q0[U0]=e0,K0++}V.attributes=Q0,V.attributesNum=K0,V.index=e}function A(){let z=V.newAttributes;for(let x=0,r=z.length;x<r;x++)z[x]=0}function R(z){E(z,0)}function E(z,x){let{newAttributes:r,enabledAttributes:e,attributeDivisors:Q0}=V;if(r[z]=1,e[z]===0)$.enableVertexAttribArray(z),e[z]=1;if(Q0[z]!==x)$.vertexAttribDivisor(z,x),Q0[z]=x}function y(){let{newAttributes:z,enabledAttributes:x}=V;for(let r=0,e=x.length;r<e;r++)if(x[r]!==z[r])$.disableVertexAttribArray(r),x[r]=0}function G(z,x,r,e,Q0,J0,K0){if(K0===!0)$.vertexAttribIPointer(z,x,r,Q0,J0);else $.vertexAttribPointer(z,x,r,e,Q0,J0)}function f(z,x,r,e){A();let Q0=e.attributes,J0=r.getAttributes(),K0=x.defaultAttributeValues;for(let F0 in J0){let U0=J0[F0];if(U0.location>=0){let C0=Q0[F0];if(C0===void 0){if(F0==="instanceMatrix"&&z.instanceMatrix)C0=z.instanceMatrix;if(F0==="instanceColor"&&z.instanceColor)C0=z.instanceColor}if(C0!==void 0){let{normalized:x0,itemSize:e0}=C0,p0=J.get(C0);if(p0===void 0)continue;let{buffer:z$,type:M$,bytesPerElement:B0}=p0,w0=M$===$.INT||M$===$.UNSIGNED_INT||C0.gpuType===1013;if(C0.isInterleavedBufferAttribute){let D0=C0.data,t0=D0.stride,N$=C0.offset;if(D0.isInstancedInterleavedBuffer){for(let X$=0;X$<U0.locationSize;X$++)E(U0.location+X$,D0.meshPerAttribute);if(z.isInstancedMesh!==!0&&e._maxInstanceCount===void 0)e._maxInstanceCount=D0.meshPerAttribute*D0.count}else for(let X$=0;X$<U0.locationSize;X$++)R(U0.location+X$);$.bindBuffer($.ARRAY_BUFFER,z$);for(let X$=0;X$<U0.locationSize;X$++)G(U0.location+X$,e0/U0.locationSize,M$,x0,t0*B0,(N$+e0/U0.locationSize*X$)*B0,w0)}else{if(C0.isInstancedBufferAttribute){for(let D0=0;D0<U0.locationSize;D0++)E(U0.location+D0,C0.meshPerAttribute);if(z.isInstancedMesh!==!0&&e._maxInstanceCount===void 0)e._maxInstanceCount=C0.meshPerAttribute*C0.count}else for(let D0=0;D0<U0.locationSize;D0++)R(U0.location+D0);$.bindBuffer($.ARRAY_BUFFER,z$);for(let D0=0;D0<U0.locationSize;D0++)G(U0.location+D0,e0/U0.locationSize,M$,x0,e0*B0,e0/U0.locationSize*D0*B0,w0)}}else if(K0!==void 0){let x0=K0[F0];if(x0!==void 0)switch(x0.length){case 2:$.vertexAttrib2fv(U0.location,x0);break;case 3:$.vertexAttrib3fv(U0.location,x0);break;case 4:$.vertexAttrib4fv(U0.location,x0);break;default:$.vertexAttrib1fv(U0.location,x0)}}}}y()}function d(){o();for(let z in Z){let x=Z[z];for(let r in x){let e=x[r];for(let Q0 in e)L(e[Q0].object),delete e[Q0];delete x[r]}delete Z[z]}}function g(z){if(Z[z.id]===void 0)return;let x=Z[z.id];for(let r in x){let e=x[r];for(let Q0 in e)L(e[Q0].object),delete e[Q0];delete x[r]}delete Z[z.id]}function b(z){for(let x in Z){let r=Z[x];if(r[z.id]===void 0)continue;let e=r[z.id];for(let Q0 in e)L(e[Q0].object),delete e[Q0];delete r[z.id]}}function o(){if(_(),q=!0,V===Y)return;V=Y,N(V.object)}function _(){Y.geometry=null,Y.program=null,Y.wireframe=!1}return{setup:U,reset:o,resetDefaultState:_,dispose:d,releaseStatesOfGeometry:g,releaseStatesOfProgram:b,initAttributes:A,enableAttribute:R,disableUnusedAttributes:y}}function D3($,J,Q){let Z;function Y(N){Z=N}function V(N,L){$.drawArrays(Z,N,L),Q.update(L,Z,1)}function q(N,L,I){if(I===0)return;$.drawArraysInstanced(Z,N,L,I),Q.update(L,Z,I)}function U(N,L,I){if(I===0)return;J.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,N,0,L,0,I);let C=0;for(let M=0;M<I;M++)C+=L[M];Q.update(C,Z,1)}function F(N,L,I,P){if(I===0)return;let C=J.get("WEBGL_multi_draw");if(C===null)for(let M=0;M<N.length;M++)q(N[M],L[M],P[M]);else{C.multiDrawArraysInstancedWEBGL(Z,N,0,L,0,P,0,I);let M=0;for(let A=0;A<I;A++)M+=L[A]*P[A];Q.update(M,Z,1)}}this.setMode=Y,this.render=V,this.renderInstances=q,this.renderMultiDraw=U,this.renderMultiDrawInstances=F}function P3($,J,Q,Z){let Y;function V(){if(Y!==void 0)return Y;if(J.has("EXT_texture_filter_anisotropic")===!0){let b=J.get("EXT_texture_filter_anisotropic");Y=$.getParameter(b.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else Y=0;return Y}function q(b){if(b!==1023&&Z.convert(b)!==$.getParameter($.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function U(b){let o=b===1016&&(J.has("EXT_color_buffer_half_float")||J.has("EXT_color_buffer_float"));if(b!==1009&&Z.convert(b)!==$.getParameter($.IMPLEMENTATION_COLOR_READ_TYPE)&&b!==1015&&!o)return!1;return!0}function F(b){if(b==="highp"){if($.getShaderPrecisionFormat($.VERTEX_SHADER,$.HIGH_FLOAT).precision>0&&$.getShaderPrecisionFormat($.FRAGMENT_SHADER,$.HIGH_FLOAT).precision>0)return"highp";b="mediump"}if(b==="mediump"){if($.getShaderPrecisionFormat($.VERTEX_SHADER,$.MEDIUM_FLOAT).precision>0&&$.getShaderPrecisionFormat($.FRAGMENT_SHADER,$.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let N=Q.precision!==void 0?Q.precision:"highp",L=F(N);if(L!==N)console.warn("THREE.WebGLRenderer:",N,"not supported, using",L,"instead."),N=L;let I=Q.logarithmicDepthBuffer===!0,P=Q.reversedDepthBuffer===!0&&J.has("EXT_clip_control"),C=$.getParameter($.MAX_TEXTURE_IMAGE_UNITS),M=$.getParameter($.MAX_VERTEX_TEXTURE_IMAGE_UNITS),A=$.getParameter($.MAX_TEXTURE_SIZE),R=$.getParameter($.MAX_CUBE_MAP_TEXTURE_SIZE),E=$.getParameter($.MAX_VERTEX_ATTRIBS),y=$.getParameter($.MAX_VERTEX_UNIFORM_VECTORS),G=$.getParameter($.MAX_VARYING_VECTORS),f=$.getParameter($.MAX_FRAGMENT_UNIFORM_VECTORS),d=M>0,g=$.getParameter($.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:V,getMaxPrecision:F,textureFormatReadable:q,textureTypeReadable:U,precision:N,logarithmicDepthBuffer:I,reversedDepthBuffer:P,maxTextures:C,maxVertexTextures:M,maxTextureSize:A,maxCubemapSize:R,maxAttributes:E,maxVertexUniforms:y,maxVaryings:G,maxFragmentUniforms:f,vertexTextures:d,maxSamples:g}}function G3($){let J=this,Q=null,Z=0,Y=!1,V=!1,q=new B5,U=new A$,F={value:null,needsUpdate:!1};this.uniform=F,this.numPlanes=0,this.numIntersection=0,this.init=function(I,P){let C=I.length!==0||P||Z!==0||Y;return Y=P,Z=I.length,C},this.beginShadows=function(){V=!0,L(null)},this.endShadows=function(){V=!1},this.setGlobalState=function(I,P){Q=L(I,P,0)},this.setState=function(I,P,C){let{clippingPlanes:M,clipIntersection:A,clipShadows:R}=I,E=$.get(I);if(!Y||M===null||M.length===0||V&&!R)if(V)L(null);else N();else{let y=V?0:Z,G=y*4,f=E.clippingState||null;F.value=f,f=L(M,P,G,C);for(let d=0;d!==G;++d)f[d]=Q[d];E.clippingState=f,this.numIntersection=A?this.numPlanes:0,this.numPlanes+=y}};function N(){if(F.value!==Q)F.value=Q,F.needsUpdate=Z>0;J.numPlanes=Z,J.numIntersection=0}function L(I,P,C,M){let A=I!==null?I.length:0,R=null;if(A!==0){if(R=F.value,M!==!0||R===null){let E=C+A*4,y=P.matrixWorldInverse;if(U.getNormalMatrix(y),R===null||R.length<E)R=new Float32Array(E);for(let G=0,f=C;G!==A;++G,f+=4)q.copy(I[G]).applyMatrix4(y,U),q.normal.toArray(R,f),R[f+3]=q.constant}F.value=R,F.needsUpdate=!0}return J.numPlanes=A,J.numIntersection=0,R}}function E3($){let J=new WeakMap;function Q(q,U){if(U===303)q.mapping=301;else if(U===304)q.mapping=302;return q}function Z(q){if(q&&q.isTexture){let U=q.mapping;if(U===303||U===304)if(J.has(q)){let F=J.get(q).texture;return Q(F,q.mapping)}else{let F=q.image;if(F&&F.height>0){let N=new qK(F.height);return N.fromEquirectangularTexture($,q),J.set(q,N),q.addEventListener("dispose",Y),Q(N.texture,q.mapping)}else return null}}return q}function Y(q){let U=q.target;U.removeEventListener("dispose",Y);let F=J.get(U);if(F!==void 0)J.delete(U),F.dispose()}function V(){J=new WeakMap}return{get:Z,dispose:V}}class MX{constructor($){this._renderer=$,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene($,J=0,Q=0.1,Z=100,Y={}){let{size:V=256,position:q=R3}=Y;PX=this._renderer.getRenderTarget(),GX=this._renderer.getActiveCubeFace(),EX=this._renderer.getActiveMipmapLevel(),RX=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(V);let U=this._allocateTargets();if(U.depthBuffer=!0,this._sceneToCubeUV($,Q,Z,U,q),J>0)this._blur(U,0,0,J);return this._applyPMREM(U),this._cleanup(U),U}fromEquirectangular($,J=null){return this._fromTexture($,J)}fromCubemap($,J=null){return this._fromTexture($,J)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=xV(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=hV(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose()}_setSize($){this._lodMax=Math.floor(Math.log2($)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let $=0;$<this._lodPlanes.length;$++)this._lodPlanes[$].dispose()}_cleanup($){this._renderer.setRenderTarget(PX,GX,EX),this._renderer.xr.enabled=RX,$.scissorTest=!1,LZ($,0,0,$.width,$.height)}_fromTexture($,J){if($.mapping===301||$.mapping===302)this._setSize($.image.length===0?16:$.image[0].width||$.image[0].image.width);else this._setSize($.image.width/4);PX=this._renderer.getRenderTarget(),GX=this._renderer.getActiveCubeFace(),EX=this._renderer.getActiveMipmapLevel(),RX=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let Q=J||this._allocateTargets();return this._textureToCubeUV($,Q),this._applyPMREM(Q),this._cleanup(Q),Q}_allocateTargets(){let $=3*Math.max(this._cubeSize,112),J=4*this._cubeSize,Q={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:"srgb-linear",depthBuffer:!1},Z=bV($,J,Q);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==$||this._pingPongRenderTarget.height!==J){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=bV($,J,Q);let{_lodMax:Y}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=j3(Y)),this._blurMaterial=C3(Y,$,J)}return Z}_compileMaterial($){let J=new V7(this._lodPlanes[0],$);this._renderer.compile(J,DX)}_sceneToCubeUV($,J,Q,Z,Y){let U=new Q7(90,1,J,Q),F=[1,-1,1,1,1,1],N=[1,1,1,-1,-1,-1],L=this._renderer,I=L.autoClear,P=L.toneMapping;if(L.getClearColor(yV),L.toneMapping=0,L.autoClear=!1,L.state.buffers.depth.getReversed())L.setRenderTarget(Z),L.clearDepth(),L.setRenderTarget(null);let M=new jZ({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),A=new V7(new h6,M),R=!1,E=$.background;if(E){if(E.isColor)M.color.copy(E),$.background=null,R=!0}else M.color.copy(yV),R=!0;for(let y=0;y<6;y++){let G=y%3;if(G===0)U.up.set(0,F[y],0),U.position.set(Y.x,Y.y,Y.z),U.lookAt(Y.x+N[y],Y.y,Y.z);else if(G===1)U.up.set(0,0,F[y]),U.position.set(Y.x,Y.y,Y.z),U.lookAt(Y.x,Y.y+N[y],Y.z);else U.up.set(0,F[y],0),U.position.set(Y.x,Y.y,Y.z),U.lookAt(Y.x,Y.y,Y.z+N[y]);let f=this._cubeSize;if(LZ(Z,G*f,y>2?f:0,f,f),L.setRenderTarget(Z),R)L.render(A,U);L.render($,U)}A.geometry.dispose(),A.material.dispose(),L.toneMapping=P,L.autoClear=I,$.background=E}_textureToCubeUV($,J){let Q=this._renderer,Z=$.mapping===301||$.mapping===302;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=xV();this._cubemapMaterial.uniforms.flipEnvMap.value=$.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=hV();let Y=Z?this._cubemapMaterial:this._equirectMaterial,V=new V7(this._lodPlanes[0],Y),q=Y.uniforms;q.envMap.value=$;let U=this._cubeSize;LZ(J,0,0,3*U,2*U),Q.setRenderTarget(J),Q.render(V,DX)}_applyPMREM($){let J=this._renderer,Q=J.autoClear;J.autoClear=!1;let Z=this._lodPlanes.length;for(let Y=1;Y<Z;Y++){let V=Math.sqrt(this._sigmas[Y]*this._sigmas[Y]-this._sigmas[Y-1]*this._sigmas[Y-1]),q=fV[(Z-Y-1)%fV.length];this._blur($,Y-1,Y,V,q)}J.autoClear=Q}_blur($,J,Q,Z,Y){let V=this._pingPongRenderTarget;this._halfBlur($,V,J,Q,Z,"latitudinal",Y),this._halfBlur(V,$,Q,Q,Z,"longitudinal",Y)}_halfBlur($,J,Q,Z,Y,V,q){let U=this._renderer,F=this._blurMaterial;if(V!=="latitudinal"&&V!=="longitudinal")console.error("blur direction must be either latitudinal or longitudinal!");let N=3,L=new V7(this._lodPlanes[Z],F),I=F.uniforms,P=this._sizeLods[Q]-1,C=isFinite(Y)?Math.PI/(2*P):2*Math.PI/(2*l5-1),M=Y/C,A=isFinite(Y)?1+Math.floor(N*M):l5;if(A>l5)console.warn(`sigmaRadians, ${Y}, is too large and will clip, as it requested ${A} samples when the maximum is set to ${l5}`);let R=[],E=0;for(let g=0;g<l5;++g){let b=g/M,o=Math.exp(-b*b/2);if(R.push(o),g===0)E+=o;else if(g<A)E+=2*o}for(let g=0;g<R.length;g++)R[g]=R[g]/E;if(I.envMap.value=$.texture,I.samples.value=A,I.weights.value=R,I.latitudinal.value=V==="latitudinal",q)I.poleAxis.value=q;let{_lodMax:y}=this;I.dTheta.value=C,I.mipInt.value=y-Q;let G=this._sizeLods[Z],f=3*G*(Z>y-z6?Z-y+z6:0),d=4*(this._cubeSize-G);LZ(J,f,d,3*G,2*G),U.setRenderTarget(J),U.render(L,DX)}}function j3($){let J=[],Q=[],Z=[],Y=$,V=$-z6+1+_V.length;for(let q=0;q<V;q++){let U=Math.pow(2,Y);Q.push(U);let F=1/U;if(q>$-z6)F=_V[q-$+z6-1];else if(q===0)F=0;Z.push(F);let N=1/(U-2),L=-N,I=1+N,P=[L,L,I,L,I,I,L,L,I,I,L,I],C=6,M=6,A=3,R=2,E=1,y=new Float32Array(A*M*C),G=new Float32Array(R*M*C),f=new Float32Array(E*M*C);for(let g=0;g<C;g++){let b=g%3*2/3-1,o=g>2?0:-1,_=[b,o,0,b+0.6666666666666666,o,0,b+0.6666666666666666,o+1,0,b,o,0,b+0.6666666666666666,o+1,0,b,o+1,0];y.set(_,A*M*g),G.set(P,R*M*g);let z=[g,g,g,g,g,g];f.set(z,E*M*g)}let d=new u9;if(d.setAttribute("position",new K7(y,A)),d.setAttribute("uv",new K7(G,R)),d.setAttribute("faceIndex",new K7(f,E)),J.push(d),Y>z6)Y--}return{lodPlanes:J,sizeLods:Q,sigmas:Z}}function bV($,J,Q){let Z=new p8($,J,Q);return Z.texture.mapping=306,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function LZ($,J,Q,Z,Y){$.viewport.set(J,Q,Z,Y),$.scissor.set(J,Q,Z,Y)}function C3($,J,Q){let Z=new Float32Array(l5),Y=new s(0,1,0);return new N8({name:"SphericalGaussianBlur",defines:{n:l5,CUBEUV_TEXEL_WIDTH:1/J,CUBEUV_TEXEL_HEIGHT:1/Q,CUBEUV_MAX_MIP:`${$}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:Y}},vertexShader:$W(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function hV(){return new N8({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$W(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function xV(){return new N8({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$W(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function $W(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function M3($){let J=new WeakMap,Q=null;function Z(U){if(U&&U.isTexture){let F=U.mapping,N=F===303||F===304,L=F===301||F===302;if(N||L){let I=J.get(U),P=I!==void 0?I.texture.pmremVersion:0;if(U.isRenderTargetTexture&&U.pmremVersion!==P){if(Q===null)Q=new MX($);return I=N?Q.fromEquirectangular(U,I):Q.fromCubemap(U,I),I.texture.pmremVersion=U.pmremVersion,J.set(U,I),I.texture}else if(I!==void 0)return I.texture;else{let C=U.image;if(N&&C&&C.height>0||L&&C&&Y(C)){if(Q===null)Q=new MX($);return I=N?Q.fromEquirectangular(U):Q.fromCubemap(U),I.texture.pmremVersion=U.pmremVersion,J.set(U,I),U.addEventListener("dispose",V),I.texture}else return null}}}return U}function Y(U){let F=0,N=6;for(let L=0;L<N;L++)if(U[L]!==void 0)F++;return F===N}function V(U){let F=U.target;F.removeEventListener("dispose",V);let N=J.get(F);if(N!==void 0)J.delete(F),N.dispose()}function q(){if(J=new WeakMap,Q!==null)Q.dispose(),Q=null}return{get:Z,dispose:q}}function v3($){let J={};function Q(Z){if(J[Z]!==void 0)return J[Z];let Y;switch(Z){case"WEBGL_depth_texture":Y=$.getExtension("WEBGL_depth_texture")||$.getExtension("MOZ_WEBGL_depth_texture")||$.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":Y=$.getExtension("EXT_texture_filter_anisotropic")||$.getExtension("MOZ_EXT_texture_filter_anisotropic")||$.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":Y=$.getExtension("WEBGL_compressed_texture_s3tc")||$.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||$.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":Y=$.getExtension("WEBGL_compressed_texture_pvrtc")||$.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:Y=$.getExtension(Z)}return J[Z]=Y,Y}return{has:function(Z){return Q(Z)!==null},init:function(){Q("EXT_color_buffer_float"),Q("WEBGL_clip_cull_distance"),Q("OES_texture_float_linear"),Q("EXT_color_buffer_half_float"),Q("WEBGL_multisampled_render_to_texture"),Q("WEBGL_render_shared_exponent")},get:function(Z){let Y=Q(Z);if(Y===null)dJ("THREE.WebGLRenderer: "+Z+" extension not supported.");return Y}}}function A3($,J,Q,Z){let Y={},V=new WeakMap;function q(I){let P=I.target;if(P.index!==null)J.remove(P.index);for(let M in P.attributes)J.remove(P.attributes[M]);P.removeEventListener("dispose",q),delete Y[P.id];let C=V.get(P);if(C)J.remove(C),V.delete(P);if(Z.releaseStatesOfGeometry(P),P.isInstancedBufferGeometry===!0)delete P._maxInstanceCount;Q.memory.geometries--}function U(I,P){if(Y[P.id]===!0)return P;return P.addEventListener("dispose",q),Y[P.id]=!0,Q.memory.geometries++,P}function F(I){let P=I.attributes;for(let C in P)J.update(P[C],$.ARRAY_BUFFER)}function N(I){let P=[],C=I.index,M=I.attributes.position,A=0;if(C!==null){let y=C.array;A=C.version;for(let G=0,f=y.length;G<f;G+=3){let d=y[G+0],g=y[G+1],b=y[G+2];P.push(d,g,g,b,b,d)}}else if(M!==void 0){let y=M.array;A=M.version;for(let G=0,f=y.length/3-1;G<f;G+=3){let d=G+0,g=G+1,b=G+2;P.push(d,g,g,b,b,d)}}else return;let R=new((QK(P))?zX:kX)(P,1);R.version=A;let E=V.get(I);if(E)J.remove(E);V.set(I,R)}function L(I){let P=V.get(I);if(P){let C=I.index;if(C!==null){if(P.version<C.version)N(I)}}else N(I);return V.get(I)}return{get:U,update:F,getWireframeAttribute:L}}function T3($,J,Q){let Z;function Y(P){Z=P}let V,q;function U(P){V=P.type,q=P.bytesPerElement}function F(P,C){$.drawElements(Z,C,V,P*q),Q.update(C,Z,1)}function N(P,C,M){if(M===0)return;$.drawElementsInstanced(Z,C,V,P*q,M),Q.update(C,Z,M)}function L(P,C,M){if(M===0)return;J.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,C,0,V,P,0,M);let R=0;for(let E=0;E<M;E++)R+=C[E];Q.update(R,Z,1)}function I(P,C,M,A){if(M===0)return;let R=J.get("WEBGL_multi_draw");if(R===null)for(let E=0;E<P.length;E++)N(P[E]/q,C[E],A[E]);else{R.multiDrawElementsInstancedWEBGL(Z,C,0,V,P,0,A,0,M);let E=0;for(let y=0;y<M;y++)E+=C[y]*A[y];Q.update(E,Z,1)}}this.setMode=Y,this.setIndex=U,this.render=F,this.renderInstances=N,this.renderMultiDraw=L,this.renderMultiDrawInstances=I}function S3($){let J={geometries:0,textures:0},Q={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(V,q,U){switch(Q.calls++,q){case $.TRIANGLES:Q.triangles+=U*(V/3);break;case $.LINES:Q.lines+=U*(V/2);break;case $.LINE_STRIP:Q.lines+=U*(V-1);break;case $.LINE_LOOP:Q.lines+=U*V;break;case $.POINTS:Q.points+=U*V;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",q);break}}function Y(){Q.calls=0,Q.triangles=0,Q.points=0,Q.lines=0}return{memory:J,render:Q,programs:null,autoReset:!0,reset:Y,update:Z}}function k3($,J,Q){let Z=new WeakMap,Y=new a$;function V(q,U,F){let N=q.morphTargetInfluences,L=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,I=L!==void 0?L.length:0,P=Z.get(U);if(P===void 0||P.count!==I){let _=function(){b.dispose(),Z.delete(U),U.removeEventListener("dispose",_)};if(P!==void 0)P.texture.dispose();let C=U.morphAttributes.position!==void 0,M=U.morphAttributes.normal!==void 0,A=U.morphAttributes.color!==void 0,R=U.morphAttributes.position||[],E=U.morphAttributes.normal||[],y=U.morphAttributes.color||[],G=0;if(C===!0)G=1;if(M===!0)G=2;if(A===!0)G=3;let f=U.attributes.position.count*G,d=1;if(f>J.maxTextureSize)d=Math.ceil(f/J.maxTextureSize),f=J.maxTextureSize;let g=new Float32Array(f*d*4*I),b=new TX(g,f,d,I);b.type=1015,b.needsUpdate=!0;let o=G*4;for(let z=0;z<I;z++){let x=R[z],r=E[z],e=y[z],Q0=f*d*4*z;for(let J0=0;J0<x.count;J0++){let K0=J0*o;if(C===!0)Y.fromBufferAttribute(x,J0),g[Q0+K0+0]=Y.x,g[Q0+K0+1]=Y.y,g[Q0+K0+2]=Y.z,g[Q0+K0+3]=0;if(M===!0)Y.fromBufferAttribute(r,J0),g[Q0+K0+4]=Y.x,g[Q0+K0+5]=Y.y,g[Q0+K0+6]=Y.z,g[Q0+K0+7]=0;if(A===!0)Y.fromBufferAttribute(e,J0),g[Q0+K0+8]=Y.x,g[Q0+K0+9]=Y.y,g[Q0+K0+10]=Y.z,g[Q0+K0+11]=e.itemSize===4?Y.w:1}}P={count:I,texture:b,size:new O$(f,d)},Z.set(U,P),U.addEventListener("dispose",_)}if(q.isInstancedMesh===!0&&q.morphTexture!==null)F.getUniforms().setValue($,"morphTexture",q.morphTexture,Q);else{let C=0;for(let A=0;A<N.length;A++)C+=N[A];let M=U.morphTargetsRelative?1:1-C;F.getUniforms().setValue($,"morphTargetBaseInfluence",M),F.getUniforms().setValue($,"morphTargetInfluences",N)}F.getUniforms().setValue($,"morphTargetsTexture",P.texture,Q),F.getUniforms().setValue($,"morphTargetsTextureSize",P.size)}return{update:V}}function z3($,J,Q,Z){let Y=new WeakMap;function V(F){let N=Z.render.frame,L=F.geometry,I=J.get(F,L);if(Y.get(I)!==N)J.update(I),Y.set(I,N);if(F.isInstancedMesh){if(F.hasEventListener("dispose",U)===!1)F.addEventListener("dispose",U);if(Y.get(F)!==N){if(Q.update(F.instanceMatrix,$.ARRAY_BUFFER),F.instanceColor!==null)Q.update(F.instanceColor,$.ARRAY_BUFFER);Y.set(F,N)}}if(F.isSkinnedMesh){let P=F.skeleton;if(Y.get(P)!==N)P.update(),Y.set(P,N)}return I}function q(){Y=new WeakMap}function U(F){let N=F.target;if(N.removeEventListener("dispose",U),Q.remove(N.instanceMatrix),N.instanceColor!==null)Q.remove(N.instanceColor)}return{update:V,dispose:q}}function u6($,J,Q){let Z=$[0];if(Z<=0||Z>0)return $;let Y=J*Q,V=uV[Y];if(V===void 0)V=new Float32Array(Y),uV[Y]=V;if(J!==0){Z.toArray(V,0);for(let q=1,U=0;q!==J;++q)U+=Q,$[q].toArray(V,U)}return V}function S9($,J){if($.length!==J.length)return!1;for(let Q=0,Z=$.length;Q<Z;Q++)if($[Q]!==J[Q])return!1;return!0}function k9($,J){for(let Q=0,Z=J.length;Q<Z;Q++)$[Q]=J[Q]}function SZ($,J){let Q=pV[J];if(Q===void 0)Q=new Int32Array(J),pV[J]=Q;for(let Z=0;Z!==J;++Z)Q[Z]=$.allocateTextureUnit();return Q}function w3($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1f(this.addr,J),Q[0]=J}function _3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2f(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(S9(Q,J))return;$.uniform2fv(this.addr,J),k9(Q,J)}}function y3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3f(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else if(J.r!==void 0){if(Q[0]!==J.r||Q[1]!==J.g||Q[2]!==J.b)$.uniform3f(this.addr,J.r,J.g,J.b),Q[0]=J.r,Q[1]=J.g,Q[2]=J.b}else{if(S9(Q,J))return;$.uniform3fv(this.addr,J),k9(Q,J)}}function f3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4f(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(S9(Q,J))return;$.uniform4fv(this.addr,J),k9(Q,J)}}function b3($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(S9(Q,J))return;$.uniformMatrix2fv(this.addr,!1,J),k9(Q,J)}else{if(S9(Q,Z))return;mV.set(Z),$.uniformMatrix2fv(this.addr,!1,mV),k9(Q,Z)}}function h3($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(S9(Q,J))return;$.uniformMatrix3fv(this.addr,!1,J),k9(Q,J)}else{if(S9(Q,Z))return;dV.set(Z),$.uniformMatrix3fv(this.addr,!1,dV),k9(Q,Z)}}function x3($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(S9(Q,J))return;$.uniformMatrix4fv(this.addr,!1,J),k9(Q,J)}else{if(S9(Q,Z))return;lV.set(Z),$.uniformMatrix4fv(this.addr,!1,lV),k9(Q,Z)}}function g3($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1i(this.addr,J),Q[0]=J}function u3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2i(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(S9(Q,J))return;$.uniform2iv(this.addr,J),k9(Q,J)}}function p3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3i(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else{if(S9(Q,J))return;$.uniform3iv(this.addr,J),k9(Q,J)}}function l3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4i(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(S9(Q,J))return;$.uniform4iv(this.addr,J),k9(Q,J)}}function d3($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1ui(this.addr,J),Q[0]=J}function m3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2ui(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(S9(Q,J))return;$.uniform2uiv(this.addr,J),k9(Q,J)}}function c3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3ui(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else{if(S9(Q,J))return;$.uniform3uiv(this.addr,J),k9(Q,J)}}function o3($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4ui(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(S9(Q,J))return;$.uniform4uiv(this.addr,J),k9(Q,J)}}function n3($,J,Q){let Z=this.cache,Y=Q.allocateTextureUnit();if(Z[0]!==Y)$.uniform1i(this.addr,Y),Z[0]=Y;let V;if(this.type===$.SAMPLER_2D_SHADOW)gV.compareFunction=515,V=gV;else V=iK;Q.setTexture2D(J||V,Y)}function s3($,J,Q){let Z=this.cache,Y=Q.allocateTextureUnit();if(Z[0]!==Y)$.uniform1i(this.addr,Y),Z[0]=Y;Q.setTexture3D(J||rK,Y)}function i3($,J,Q){let Z=this.cache,Y=Q.allocateTextureUnit();if(Z[0]!==Y)$.uniform1i(this.addr,Y),Z[0]=Y;Q.setTextureCube(J||tK,Y)}function a3($,J,Q){let Z=this.cache,Y=Q.allocateTextureUnit();if(Z[0]!==Y)$.uniform1i(this.addr,Y),Z[0]=Y;Q.setTexture2DArray(J||aK,Y)}function r3($){switch($){case 5126:return w3;case 35664:return _3;case 35665:return y3;case 35666:return f3;case 35674:return b3;case 35675:return h3;case 35676:return x3;case 5124:case 35670:return g3;case 35667:case 35671:return u3;case 35668:case 35672:return p3;case 35669:case 35673:return l3;case 5125:return d3;case 36294:return m3;case 36295:return c3;case 36296:return o3;case 35678:case 36198:case 36298:case 36306:case 35682:return n3;case 35679:case 36299:case 36307:return s3;case 35680:case 36300:case 36308:case 36293:return i3;case 36289:case 36303:case 36311:case 36292:return a3}}function t3($,J){$.uniform1fv(this.addr,J)}function e3($,J){let Q=u6(J,this.size,2);$.uniform2fv(this.addr,Q)}function $O($,J){let Q=u6(J,this.size,3);$.uniform3fv(this.addr,Q)}function JO($,J){let Q=u6(J,this.size,4);$.uniform4fv(this.addr,Q)}function QO($,J){let Q=u6(J,this.size,4);$.uniformMatrix2fv(this.addr,!1,Q)}function ZO($,J){let Q=u6(J,this.size,9);$.uniformMatrix3fv(this.addr,!1,Q)}function XO($,J){let Q=u6(J,this.size,16);$.uniformMatrix4fv(this.addr,!1,Q)}function WO($,J){$.uniform1iv(this.addr,J)}function YO($,J){$.uniform2iv(this.addr,J)}function VO($,J){$.uniform3iv(this.addr,J)}function KO($,J){$.uniform4iv(this.addr,J)}function UO($,J){$.uniform1uiv(this.addr,J)}function qO($,J){$.uniform2uiv(this.addr,J)}function HO($,J){$.uniform3uiv(this.addr,J)}function FO($,J){$.uniform4uiv(this.addr,J)}function BO($,J,Q){let Z=this.cache,Y=J.length,V=SZ(Q,Y);if(!S9(Z,V))$.uniform1iv(this.addr,V),k9(Z,V);for(let q=0;q!==Y;++q)Q.setTexture2D(J[q]||iK,V[q])}function NO($,J,Q){let Z=this.cache,Y=J.length,V=SZ(Q,Y);if(!S9(Z,V))$.uniform1iv(this.addr,V),k9(Z,V);for(let q=0;q!==Y;++q)Q.setTexture3D(J[q]||rK,V[q])}function OO($,J,Q){let Z=this.cache,Y=J.length,V=SZ(Q,Y);if(!S9(Z,V))$.uniform1iv(this.addr,V),k9(Z,V);for(let q=0;q!==Y;++q)Q.setTextureCube(J[q]||tK,V[q])}function LO($,J,Q){let Z=this.cache,Y=J.length,V=SZ(Q,Y);if(!S9(Z,V))$.uniform1iv(this.addr,V),k9(Z,V);for(let q=0;q!==Y;++q)Q.setTexture2DArray(J[q]||aK,V[q])}function IO($){switch($){case 5126:return t3;case 35664:return e3;case 35665:return $O;case 35666:return JO;case 35674:return QO;case 35675:return ZO;case 35676:return XO;case 5124:case 35670:return WO;case 35667:case 35671:return YO;case 35668:case 35672:return VO;case 35669:case 35673:return KO;case 5125:return UO;case 36294:return qO;case 36295:return HO;case 36296:return FO;case 35678:case 36198:case 36298:case 36306:case 35682:return BO;case 35679:case 36299:case 36307:return NO;case 35680:case 36300:case 36308:case 36293:return OO;case 36289:case 36303:case 36311:case 36292:return LO}}class eK{constructor($,J,Q){this.id=$,this.addr=Q,this.cache=[],this.type=J.type,this.setValue=r3(J.type)}}class $U{constructor($,J,Q){this.id=$,this.addr=Q,this.cache=[],this.type=J.type,this.size=J.size,this.setValue=IO(J.type)}}class JU{constructor($){this.id=$,this.seq=[],this.map={}}setValue($,J,Q){let Z=this.seq;for(let Y=0,V=Z.length;Y!==V;++Y){let q=Z[Y];q.setValue($,J[q.id],Q)}}}function cV($,J){$.seq.push(J),$.map[J.id]=J}function DO($,J,Q){let Z=$.name,Y=Z.length;jX.lastIndex=0;while(!0){let V=jX.exec(Z),q=jX.lastIndex,U=V[1],F=V[2]==="]",N=V[3];if(F)U=U|0;if(N===void 0||N==="["&&q+2===Y){cV(Q,N===void 0?new eK(U,$,J):new $U(U,$,J));break}else{let I=Q.map[U];if(I===void 0)I=new JU(U),cV(Q,I);Q=I}}}class pJ{constructor($,J){this.seq=[],this.map={};let Q=$.getProgramParameter(J,$.ACTIVE_UNIFORMS);for(let Z=0;Z<Q;++Z){let Y=$.getActiveUniform(J,Z),V=$.getUniformLocation(J,Y.name);DO(Y,V,this)}}setValue($,J,Q,Z){let Y=this.map[J];if(Y!==void 0)Y.setValue($,Q,Z)}setOptional($,J,Q){let Z=J[Q];if(Z!==void 0)this.setValue($,Q,Z)}static upload($,J,Q,Z){for(let Y=0,V=J.length;Y!==V;++Y){let q=J[Y],U=Q[q.id];if(U.needsUpdate!==!1)q.setValue($,U.value,Z)}}static seqWithValue($,J){let Q=[];for(let Z=0,Y=$.length;Z!==Y;++Z){let V=$[Z];if(V.id in J)Q.push(V)}return Q}}function oV($,J,Q){let Z=$.createShader(J);return $.shaderSource(Z,Q),$.compileShader(Z),Z}function EO($,J){let Q=$.split(`
`),Z=[],Y=Math.max(J-6,0),V=Math.min(J+6,Q.length);for(let q=Y;q<V;q++){let U=q+1;Z.push(`${U===J?">":" "} ${U}: ${Q[q]}`)}return Z.join(`
`)}function RO($){o$._getMatrix(nV,o$.workingColorSpace,$);let J=`mat3( ${nV.elements.map((Q)=>Q.toFixed(4))} )`;switch(o$.getTransfer($)){case"linear":return[J,"LinearTransferOETF"];case"srgb":return[J,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",$),[J,"LinearTransferOETF"]}}function sV($,J,Q){let Z=$.getShaderParameter(J,$.COMPILE_STATUS),V=($.getShaderInfoLog(J)||"").trim();if(Z&&V==="")return"";let q=/ERROR: 0:(\d+)/.exec(V);if(q){let U=parseInt(q[1]);return Q.toUpperCase()+`

`+V+`

`+EO($.getShaderSource(J),U)}else return V}function jO($,J){let Q=RO(J);return[`vec4 ${$}( vec4 value ) {`,`	return ${Q[1]}( vec4( value.rgb * ${Q[0]}, value.a ) );`,"}"].join(`
`)}function CO($,J){let Q;switch(J){case 1:Q="Linear";break;case 2:Q="Reinhard";break;case 3:Q="Cineon";break;case 4:Q="ACESFilmic";break;case 6:Q="AgX";break;case 7:Q="Neutral";break;case 5:Q="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",J),Q="Linear"}return"vec3 "+$+"( vec3 color ) { return "+Q+"ToneMapping( color ); }"}function MO(){o$.getLuminanceCoefficients(IZ);let $=IZ.x.toFixed(4),J=IZ.y.toFixed(4),Q=IZ.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${$}, ${J}, ${Q} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function vO($){return[$.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",$.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(xJ).join(`
`)}function AO($){let J=[];for(let Q in $){let Z=$[Q];if(Z===!1)continue;J.push("#define "+Q+" "+Z)}return J.join(`
`)}function TO($,J){let Q={},Z=$.getProgramParameter(J,$.ACTIVE_ATTRIBUTES);for(let Y=0;Y<Z;Y++){let V=$.getActiveAttrib(J,Y),q=V.name,U=1;if(V.type===$.FLOAT_MAT2)U=2;if(V.type===$.FLOAT_MAT3)U=3;if(V.type===$.FLOAT_MAT4)U=4;Q[q]={type:V.type,location:$.getAttribLocation(J,q),locationSize:U}}return Q}function xJ($){return $!==""}function iV($,J){let Q=J.numSpotLightShadows+J.numSpotLightMaps-J.numSpotLightShadowsWithMaps;return $.replace(/NUM_DIR_LIGHTS/g,J.numDirLights).replace(/NUM_SPOT_LIGHTS/g,J.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,J.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,Q).replace(/NUM_RECT_AREA_LIGHTS/g,J.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,J.numPointLights).replace(/NUM_HEMI_LIGHTS/g,J.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,J.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,J.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,J.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,J.numPointLightShadows)}function aV($,J){return $.replace(/NUM_CLIPPING_PLANES/g,J.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,J.numClippingPlanes-J.numClipIntersection)}function vX($){return $.replace(SO,zO)}function zO($,J){let Q=T$[J];if(Q===void 0){let Z=kO.get(J);if(Z!==void 0)Q=T$[Z],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',J,Z);else throw Error("Can not resolve #include <"+J+">")}return vX(Q)}function rV($){return $.replace(wO,_O)}function _O($,J,Q,Z){let Y="";for(let V=parseInt(J);V<parseInt(Q);V++)Y+=Z.replace(/\[\s*i\s*\]/g,"[ "+V+" ]").replace(/UNROLLED_LOOP_INDEX/g,V);return Y}function tV($){let J=`precision ${$.precision} float;
	precision ${$.precision} int;
	precision ${$.precision} sampler2D;
	precision ${$.precision} samplerCube;
	precision ${$.precision} sampler3D;
	precision ${$.precision} sampler2DArray;
	precision ${$.precision} sampler2DShadow;
	precision ${$.precision} samplerCubeShadow;
	precision ${$.precision} sampler2DArrayShadow;
	precision ${$.precision} isampler2D;
	precision ${$.precision} isampler3D;
	precision ${$.precision} isamplerCube;
	precision ${$.precision} isampler2DArray;
	precision ${$.precision} usampler2D;
	precision ${$.precision} usampler3D;
	precision ${$.precision} usamplerCube;
	precision ${$.precision} usampler2DArray;
	`;if($.precision==="highp")J+=`
#define HIGH_PRECISION`;else if($.precision==="mediump")J+=`
#define MEDIUM_PRECISION`;else if($.precision==="lowp")J+=`
#define LOW_PRECISION`;return J}function yO($){let J="SHADOWMAP_TYPE_BASIC";if($.shadowMapType===1)J="SHADOWMAP_TYPE_PCF";else if($.shadowMapType===2)J="SHADOWMAP_TYPE_PCF_SOFT";else if($.shadowMapType===3)J="SHADOWMAP_TYPE_VSM";return J}function fO($){let J="ENVMAP_TYPE_CUBE";if($.envMap)switch($.envMapMode){case 301:case 302:J="ENVMAP_TYPE_CUBE";break;case 306:J="ENVMAP_TYPE_CUBE_UV";break}return J}function bO($){let J="ENVMAP_MODE_REFLECTION";if($.envMap)switch($.envMapMode){case 302:J="ENVMAP_MODE_REFRACTION";break}return J}function hO($){let J="ENVMAP_BLENDING_NONE";if($.envMap)switch($.combine){case 0:J="ENVMAP_BLENDING_MULTIPLY";break;case 1:J="ENVMAP_BLENDING_MIX";break;case 2:J="ENVMAP_BLENDING_ADD";break}return J}function xO($){let J=$.envMapCubeUVHeight;if(J===null)return null;let Q=Math.log2(J)-2,Z=1/J;return{texelWidth:1/(3*Math.max(Math.pow(2,Q),112)),texelHeight:Z,maxMip:Q}}function gO($,J,Q,Z){let Y=$.getContext(),V=Q.defines,q=Q.vertexShader,U=Q.fragmentShader,F=yO(Q),N=fO(Q),L=bO(Q),I=hO(Q),P=xO(Q),C=vO(Q),M=AO(V),A=Y.createProgram(),R,E,y=Q.glslVersion?"#version "+Q.glslVersion+`
`:"";if(Q.isRawShaderMaterial){if(R=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,M].filter(xJ).join(`
`),R.length>0)R+=`
`;if(E=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,M].filter(xJ).join(`
`),E.length>0)E+=`
`}else R=[tV(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,M,Q.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",Q.batching?"#define USE_BATCHING":"",Q.batchingColor?"#define USE_BATCHING_COLOR":"",Q.instancing?"#define USE_INSTANCING":"",Q.instancingColor?"#define USE_INSTANCING_COLOR":"",Q.instancingMorph?"#define USE_INSTANCING_MORPH":"",Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.map?"#define USE_MAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+L:"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.displacementMap?"#define USE_DISPLACEMENTMAP":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.mapUv?"#define MAP_UV "+Q.mapUv:"",Q.alphaMapUv?"#define ALPHAMAP_UV "+Q.alphaMapUv:"",Q.lightMapUv?"#define LIGHTMAP_UV "+Q.lightMapUv:"",Q.aoMapUv?"#define AOMAP_UV "+Q.aoMapUv:"",Q.emissiveMapUv?"#define EMISSIVEMAP_UV "+Q.emissiveMapUv:"",Q.bumpMapUv?"#define BUMPMAP_UV "+Q.bumpMapUv:"",Q.normalMapUv?"#define NORMALMAP_UV "+Q.normalMapUv:"",Q.displacementMapUv?"#define DISPLACEMENTMAP_UV "+Q.displacementMapUv:"",Q.metalnessMapUv?"#define METALNESSMAP_UV "+Q.metalnessMapUv:"",Q.roughnessMapUv?"#define ROUGHNESSMAP_UV "+Q.roughnessMapUv:"",Q.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+Q.anisotropyMapUv:"",Q.clearcoatMapUv?"#define CLEARCOATMAP_UV "+Q.clearcoatMapUv:"",Q.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+Q.clearcoatNormalMapUv:"",Q.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+Q.clearcoatRoughnessMapUv:"",Q.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+Q.iridescenceMapUv:"",Q.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+Q.iridescenceThicknessMapUv:"",Q.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+Q.sheenColorMapUv:"",Q.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+Q.sheenRoughnessMapUv:"",Q.specularMapUv?"#define SPECULARMAP_UV "+Q.specularMapUv:"",Q.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+Q.specularColorMapUv:"",Q.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+Q.specularIntensityMapUv:"",Q.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+Q.transmissionMapUv:"",Q.thicknessMapUv?"#define THICKNESSMAP_UV "+Q.thicknessMapUv:"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.flatShading?"#define FLAT_SHADED":"",Q.skinning?"#define USE_SKINNING":"",Q.morphTargets?"#define USE_MORPHTARGETS":"",Q.morphNormals&&Q.flatShading===!1?"#define USE_MORPHNORMALS":"",Q.morphColors?"#define USE_MORPHCOLORS":"",Q.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+Q.morphTextureStride:"",Q.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+Q.morphTargetsCount:"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+F:"",Q.sizeAttenuation?"#define USE_SIZEATTENUATION":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",Q.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(xJ).join(`
`),E=[tV(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,M,Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",Q.map?"#define USE_MAP":"",Q.matcap?"#define USE_MATCAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+N:"",Q.envMap?"#define "+L:"",Q.envMap?"#define "+I:"",P?"#define CUBEUV_TEXEL_WIDTH "+P.texelWidth:"",P?"#define CUBEUV_TEXEL_HEIGHT "+P.texelHeight:"",P?"#define CUBEUV_MAX_MIP "+P.maxMip+".0":"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoat?"#define USE_CLEARCOAT":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.dispersion?"#define USE_DISPERSION":"",Q.iridescence?"#define USE_IRIDESCENCE":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaTest?"#define USE_ALPHATEST":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.sheen?"#define USE_SHEEN":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors||Q.instancingColor||Q.batchingColor?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.gradientMap?"#define USE_GRADIENTMAP":"",Q.flatShading?"#define FLAT_SHADED":"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+F:"",Q.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",Q.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",Q.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",Q.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",Q.toneMapping!==0?"#define TONE_MAPPING":"",Q.toneMapping!==0?T$.tonemapping_pars_fragment:"",Q.toneMapping!==0?CO("toneMapping",Q.toneMapping):"",Q.dithering?"#define DITHERING":"",Q.opaque?"#define OPAQUE":"",T$.colorspace_pars_fragment,jO("linearToOutputTexel",Q.outputColorSpace),MO(),Q.useDepthPacking?"#define DEPTH_PACKING "+Q.depthPacking:"",`
`].filter(xJ).join(`
`);if(q=vX(q),q=iV(q,Q),q=aV(q,Q),U=vX(U),U=iV(U,Q),U=aV(U,Q),q=rV(q),U=rV(U),Q.isRawShaderMaterial!==!0)y=`#version 300 es
`,R=[C,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+R,E=["#define varying in",Q.glslVersion==="300 es"?"":"layout(location = 0) out highp vec4 pc_fragColor;",Q.glslVersion==="300 es"?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+E;let G=y+R+q,f=y+E+U,d=oV(Y,Y.VERTEX_SHADER,G),g=oV(Y,Y.FRAGMENT_SHADER,f);if(Y.attachShader(A,d),Y.attachShader(A,g),Q.index0AttributeName!==void 0)Y.bindAttribLocation(A,0,Q.index0AttributeName);else if(Q.morphTargets===!0)Y.bindAttribLocation(A,0,"position");Y.linkProgram(A);function b(x){if($.debug.checkShaderErrors){let r=Y.getProgramInfoLog(A)||"",e=Y.getShaderInfoLog(d)||"",Q0=Y.getShaderInfoLog(g)||"",J0=r.trim(),K0=e.trim(),F0=Q0.trim(),U0=!0,C0=!0;if(Y.getProgramParameter(A,Y.LINK_STATUS)===!1)if(U0=!1,typeof $.debug.onShaderError==="function")$.debug.onShaderError(Y,A,d,g);else{let x0=sV(Y,d,"vertex"),e0=sV(Y,g,"fragment");console.error("THREE.WebGLProgram: Shader Error "+Y.getError()+" - VALIDATE_STATUS "+Y.getProgramParameter(A,Y.VALIDATE_STATUS)+`

Material Name: `+x.name+`
Material Type: `+x.type+`

Program Info Log: `+J0+`
`+x0+`
`+e0)}else if(J0!=="")console.warn("THREE.WebGLProgram: Program Info Log:",J0);else if(K0===""||F0==="")C0=!1;if(C0)x.diagnostics={runnable:U0,programLog:J0,vertexShader:{log:K0,prefix:R},fragmentShader:{log:F0,prefix:E}}}Y.deleteShader(d),Y.deleteShader(g),o=new pJ(Y,A),_=TO(Y,A)}let o;this.getUniforms=function(){if(o===void 0)b(this);return o};let _;this.getAttributes=function(){if(_===void 0)b(this);return _};let z=Q.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(z===!1)z=Y.getProgramParameter(A,PO);return z},this.destroy=function(){Z.releaseStatesOfProgram(this),Y.deleteProgram(A),this.program=void 0},this.type=Q.shaderType,this.name=Q.shaderName,this.id=GO++,this.cacheKey=J,this.usedTimes=1,this.program=A,this.vertexShader=d,this.fragmentShader=g,this}class QU{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update($){let{vertexShader:J,fragmentShader:Q}=$,Z=this._getShaderStage(J),Y=this._getShaderStage(Q),V=this._getShaderCacheForMaterial($);if(V.has(Z)===!1)V.add(Z),Z.usedTimes++;if(V.has(Y)===!1)V.add(Y),Y.usedTimes++;return this}remove($){let J=this.materialCache.get($);for(let Q of J)if(Q.usedTimes--,Q.usedTimes===0)this.shaderCache.delete(Q.code);return this.materialCache.delete($),this}getVertexShaderID($){return this._getShaderStage($.vertexShader).id}getFragmentShaderID($){return this._getShaderStage($.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial($){let J=this.materialCache,Q=J.get($);if(Q===void 0)Q=new Set,J.set($,Q);return Q}_getShaderStage($){let J=this.shaderCache,Q=J.get($);if(Q===void 0)Q=new ZU($),J.set($,Q);return Q}}class ZU{constructor($){this.id=uO++,this.code=$,this.usedTimes=0}}function pO($,J,Q,Z,Y,V,q){let U=new SX,F=new QU,N=new Set,L=[],I=Y.logarithmicDepthBuffer,P=Y.vertexTextures,C=Y.precision,M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function A(_){if(N.add(_),_===0)return"uv";return`uv${_}`}function R(_,z,x,r,e){let Q0=r.fog,J0=e.geometry,K0=_.isMeshStandardMaterial?r.environment:null,F0=(_.isMeshStandardMaterial?Q:J).get(_.envMap||K0),U0=!!F0&&F0.mapping===306?F0.image.height:null,C0=M[_.type];if(_.precision!==null){if(C=Y.getMaxPrecision(_.precision),C!==_.precision)console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",C,"instead.")}let x0=J0.morphAttributes.position||J0.morphAttributes.normal||J0.morphAttributes.color,e0=x0!==void 0?x0.length:0,p0=0;if(J0.morphAttributes.position!==void 0)p0=1;if(J0.morphAttributes.normal!==void 0)p0=2;if(J0.morphAttributes.color!==void 0)p0=3;let z$,M$,B0,w0;if(C0){let l$=B8[C0];z$=l$.vertexShader,M$=l$.fragmentShader}else z$=_.vertexShader,M$=_.fragmentShader,F.update(_),B0=F.getVertexShaderID(_),w0=F.getFragmentShaderID(_);let D0=$.getRenderTarget(),t0=$.state.buffers.depth.getReversed(),N$=e.isInstancedMesh===!0,X$=e.isBatchedMesh===!0,I9=!!_.map,l=!!_.matcap,f$=!!F0,L$=!!_.aoMap,q$=!!_.lightMap,i0=!!_.bumpMap,b$=!!_.normalMap,o0=!!_.displacementMap,W$=!!_.emissiveMap,F9=!!_.metalnessMap,s0=!!_.roughnessMap,G0=_.anisotropy>0,u=_.clearcoat>0,T=_.dispersion>0,i=_.iridescence>0,V0=_.sheen>0,n=_.transmission>0,W0=G0&&!!_.anisotropyMap,R0=u&&!!_.clearcoatMap,j0=u&&!!_.clearcoatNormalMap,a0=u&&!!_.clearcoatRoughnessMap,U$=i&&!!_.iridescenceMap,L0=i&&!!_.iridescenceThicknessMap,_0=V0&&!!_.sheenColorMap,l0=V0&&!!_.sheenRoughnessMap,r0=!!_.specularMap,v0=!!_.specularColorMap,F$=!!_.specularIntensityMap,m=n&&!!_.transmissionMap,S0=n&&!!_.thicknessMap,A0=!!_.gradientMap,d0=!!_.alphaMap,P0=_.alphaTest>0,O0=!!_.alphaHash,n0=!!_.extensions,I$=0;if(_.toneMapped){if(D0===null||D0.isXRRenderTarget===!0)I$=$.toneMapping}let n$={shaderID:C0,shaderType:_.type,shaderName:_.name,vertexShader:z$,fragmentShader:M$,defines:_.defines,customVertexShaderID:B0,customFragmentShaderID:w0,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:C,batching:X$,batchingColor:X$&&e._colorsTexture!==null,instancing:N$,instancingColor:N$&&e.instanceColor!==null,instancingMorph:N$&&e.morphTexture!==null,supportsVertexTextures:P,outputColorSpace:D0===null?$.outputColorSpace:D0.isXRRenderTarget===!0?D0.texture.colorSpace:"srgb-linear",alphaToCoverage:!!_.alphaToCoverage,map:I9,matcap:l,envMap:f$,envMapMode:f$&&F0.mapping,envMapCubeUVHeight:U0,aoMap:L$,lightMap:q$,bumpMap:i0,normalMap:b$,displacementMap:P&&o0,emissiveMap:W$,normalMapObjectSpace:b$&&_.normalMapType===1,normalMapTangentSpace:b$&&_.normalMapType===0,metalnessMap:F9,roughnessMap:s0,anisotropy:G0,anisotropyMap:W0,clearcoat:u,clearcoatMap:R0,clearcoatNormalMap:j0,clearcoatRoughnessMap:a0,dispersion:T,iridescence:i,iridescenceMap:U$,iridescenceThicknessMap:L0,sheen:V0,sheenColorMap:_0,sheenRoughnessMap:l0,specularMap:r0,specularColorMap:v0,specularIntensityMap:F$,transmission:n,transmissionMap:m,thicknessMap:S0,gradientMap:A0,opaque:_.transparent===!1&&_.blending===1&&_.alphaToCoverage===!1,alphaMap:d0,alphaTest:P0,alphaHash:O0,combine:_.combine,mapUv:I9&&A(_.map.channel),aoMapUv:L$&&A(_.aoMap.channel),lightMapUv:q$&&A(_.lightMap.channel),bumpMapUv:i0&&A(_.bumpMap.channel),normalMapUv:b$&&A(_.normalMap.channel),displacementMapUv:o0&&A(_.displacementMap.channel),emissiveMapUv:W$&&A(_.emissiveMap.channel),metalnessMapUv:F9&&A(_.metalnessMap.channel),roughnessMapUv:s0&&A(_.roughnessMap.channel),anisotropyMapUv:W0&&A(_.anisotropyMap.channel),clearcoatMapUv:R0&&A(_.clearcoatMap.channel),clearcoatNormalMapUv:j0&&A(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:a0&&A(_.clearcoatRoughnessMap.channel),iridescenceMapUv:U$&&A(_.iridescenceMap.channel),iridescenceThicknessMapUv:L0&&A(_.iridescenceThicknessMap.channel),sheenColorMapUv:_0&&A(_.sheenColorMap.channel),sheenRoughnessMapUv:l0&&A(_.sheenRoughnessMap.channel),specularMapUv:r0&&A(_.specularMap.channel),specularColorMapUv:v0&&A(_.specularColorMap.channel),specularIntensityMapUv:F$&&A(_.specularIntensityMap.channel),transmissionMapUv:m&&A(_.transmissionMap.channel),thicknessMapUv:S0&&A(_.thicknessMap.channel),alphaMapUv:d0&&A(_.alphaMap.channel),vertexTangents:!!J0.attributes.tangent&&(b$||G0),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!J0.attributes.color&&J0.attributes.color.itemSize===4,pointsUvs:e.isPoints===!0&&!!J0.attributes.uv&&(I9||d0),fog:!!Q0,useFog:_.fog===!0,fogExp2:!!Q0&&Q0.isFogExp2,flatShading:_.flatShading===!0&&_.wireframe===!1,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:I,reversedDepthBuffer:t0,skinning:e.isSkinnedMesh===!0,morphTargets:J0.morphAttributes.position!==void 0,morphNormals:J0.morphAttributes.normal!==void 0,morphColors:J0.morphAttributes.color!==void 0,morphTargetsCount:e0,morphTextureStride:p0,numDirLights:z.directional.length,numPointLights:z.point.length,numSpotLights:z.spot.length,numSpotLightMaps:z.spotLightMap.length,numRectAreaLights:z.rectArea.length,numHemiLights:z.hemi.length,numDirLightShadows:z.directionalShadowMap.length,numPointLightShadows:z.pointShadowMap.length,numSpotLightShadows:z.spotShadowMap.length,numSpotLightShadowsWithMaps:z.numSpotLightShadowsWithMaps,numLightProbes:z.numLightProbes,numClippingPlanes:q.numPlanes,numClipIntersection:q.numIntersection,dithering:_.dithering,shadowMapEnabled:$.shadowMap.enabled&&x.length>0,shadowMapType:$.shadowMap.type,toneMapping:I$,decodeVideoTexture:I9&&_.map.isVideoTexture===!0&&o$.getTransfer(_.map.colorSpace)==="srgb",decodeVideoTextureEmissive:W$&&_.emissiveMap.isVideoTexture===!0&&o$.getTransfer(_.emissiveMap.colorSpace)==="srgb",premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===2,flipSided:_.side===1,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:n0&&_.extensions.clipCullDistance===!0&&Z.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(n0&&_.extensions.multiDraw===!0||X$)&&Z.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:Z.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return n$.vertexUv1s=N.has(1),n$.vertexUv2s=N.has(2),n$.vertexUv3s=N.has(3),N.clear(),n$}function E(_){let z=[];if(_.shaderID)z.push(_.shaderID);else z.push(_.customVertexShaderID),z.push(_.customFragmentShaderID);if(_.defines!==void 0)for(let x in _.defines)z.push(x),z.push(_.defines[x]);if(_.isRawShaderMaterial===!1)y(z,_),G(z,_),z.push($.outputColorSpace);return z.push(_.customProgramCacheKey),z.join()}function y(_,z){_.push(z.precision),_.push(z.outputColorSpace),_.push(z.envMapMode),_.push(z.envMapCubeUVHeight),_.push(z.mapUv),_.push(z.alphaMapUv),_.push(z.lightMapUv),_.push(z.aoMapUv),_.push(z.bumpMapUv),_.push(z.normalMapUv),_.push(z.displacementMapUv),_.push(z.emissiveMapUv),_.push(z.metalnessMapUv),_.push(z.roughnessMapUv),_.push(z.anisotropyMapUv),_.push(z.clearcoatMapUv),_.push(z.clearcoatNormalMapUv),_.push(z.clearcoatRoughnessMapUv),_.push(z.iridescenceMapUv),_.push(z.iridescenceThicknessMapUv),_.push(z.sheenColorMapUv),_.push(z.sheenRoughnessMapUv),_.push(z.specularMapUv),_.push(z.specularColorMapUv),_.push(z.specularIntensityMapUv),_.push(z.transmissionMapUv),_.push(z.thicknessMapUv),_.push(z.combine),_.push(z.fogExp2),_.push(z.sizeAttenuation),_.push(z.morphTargetsCount),_.push(z.morphAttributeCount),_.push(z.numDirLights),_.push(z.numPointLights),_.push(z.numSpotLights),_.push(z.numSpotLightMaps),_.push(z.numHemiLights),_.push(z.numRectAreaLights),_.push(z.numDirLightShadows),_.push(z.numPointLightShadows),_.push(z.numSpotLightShadows),_.push(z.numSpotLightShadowsWithMaps),_.push(z.numLightProbes),_.push(z.shadowMapType),_.push(z.toneMapping),_.push(z.numClippingPlanes),_.push(z.numClipIntersection),_.push(z.depthPacking)}function G(_,z){if(U.disableAll(),z.supportsVertexTextures)U.enable(0);if(z.instancing)U.enable(1);if(z.instancingColor)U.enable(2);if(z.instancingMorph)U.enable(3);if(z.matcap)U.enable(4);if(z.envMap)U.enable(5);if(z.normalMapObjectSpace)U.enable(6);if(z.normalMapTangentSpace)U.enable(7);if(z.clearcoat)U.enable(8);if(z.iridescence)U.enable(9);if(z.alphaTest)U.enable(10);if(z.vertexColors)U.enable(11);if(z.vertexAlphas)U.enable(12);if(z.vertexUv1s)U.enable(13);if(z.vertexUv2s)U.enable(14);if(z.vertexUv3s)U.enable(15);if(z.vertexTangents)U.enable(16);if(z.anisotropy)U.enable(17);if(z.alphaHash)U.enable(18);if(z.batching)U.enable(19);if(z.dispersion)U.enable(20);if(z.batchingColor)U.enable(21);if(z.gradientMap)U.enable(22);if(_.push(U.mask),U.disableAll(),z.fog)U.enable(0);if(z.useFog)U.enable(1);if(z.flatShading)U.enable(2);if(z.logarithmicDepthBuffer)U.enable(3);if(z.reversedDepthBuffer)U.enable(4);if(z.skinning)U.enable(5);if(z.morphTargets)U.enable(6);if(z.morphNormals)U.enable(7);if(z.morphColors)U.enable(8);if(z.premultipliedAlpha)U.enable(9);if(z.shadowMapEnabled)U.enable(10);if(z.doubleSided)U.enable(11);if(z.flipSided)U.enable(12);if(z.useDepthPacking)U.enable(13);if(z.dithering)U.enable(14);if(z.transmission)U.enable(15);if(z.sheen)U.enable(16);if(z.opaque)U.enable(17);if(z.pointsUvs)U.enable(18);if(z.decodeVideoTexture)U.enable(19);if(z.decodeVideoTextureEmissive)U.enable(20);if(z.alphaToCoverage)U.enable(21);_.push(U.mask)}function f(_){let z=M[_.type],x;if(z){let r=B8[z];x=HF.clone(r.uniforms)}else x=_.uniforms;return x}function d(_,z){let x;for(let r=0,e=L.length;r<e;r++){let Q0=L[r];if(Q0.cacheKey===z){x=Q0,++x.usedTimes;break}}if(x===void 0)x=new gO($,z,_,V),L.push(x);return x}function g(_){if(--_.usedTimes===0){let z=L.indexOf(_);L[z]=L[L.length-1],L.pop(),_.destroy()}}function b(_){F.remove(_)}function o(){F.dispose()}return{getParameters:R,getProgramCacheKey:E,getUniforms:f,acquireProgram:d,releaseProgram:g,releaseShaderCache:b,programs:L,dispose:o}}function lO(){let $=new WeakMap;function J(q){return $.has(q)}function Q(q){let U=$.get(q);if(U===void 0)U={},$.set(q,U);return U}function Z(q){$.delete(q)}function Y(q,U,F){$.get(q)[U]=F}function V(){$=new WeakMap}return{has:J,get:Q,remove:Z,update:Y,dispose:V}}function dO($,J){if($.groupOrder!==J.groupOrder)return $.groupOrder-J.groupOrder;else if($.renderOrder!==J.renderOrder)return $.renderOrder-J.renderOrder;else if($.material.id!==J.material.id)return $.material.id-J.material.id;else if($.z!==J.z)return $.z-J.z;else return $.id-J.id}function eV($,J){if($.groupOrder!==J.groupOrder)return $.groupOrder-J.groupOrder;else if($.renderOrder!==J.renderOrder)return $.renderOrder-J.renderOrder;else if($.z!==J.z)return J.z-$.z;else return $.id-J.id}function $K(){let $=[],J=0,Q=[],Z=[],Y=[];function V(){J=0,Q.length=0,Z.length=0,Y.length=0}function q(I,P,C,M,A,R){let E=$[J];if(E===void 0)E={id:I.id,object:I,geometry:P,material:C,groupOrder:M,renderOrder:I.renderOrder,z:A,group:R},$[J]=E;else E.id=I.id,E.object=I,E.geometry=P,E.material=C,E.groupOrder=M,E.renderOrder=I.renderOrder,E.z=A,E.group=R;return J++,E}function U(I,P,C,M,A,R){let E=q(I,P,C,M,A,R);if(C.transmission>0)Z.push(E);else if(C.transparent===!0)Y.push(E);else Q.push(E)}function F(I,P,C,M,A,R){let E=q(I,P,C,M,A,R);if(C.transmission>0)Z.unshift(E);else if(C.transparent===!0)Y.unshift(E);else Q.unshift(E)}function N(I,P){if(Q.length>1)Q.sort(I||dO);if(Z.length>1)Z.sort(P||eV);if(Y.length>1)Y.sort(P||eV)}function L(){for(let I=J,P=$.length;I<P;I++){let C=$[I];if(C.id===null)break;C.id=null,C.object=null,C.geometry=null,C.material=null,C.group=null}}return{opaque:Q,transmissive:Z,transparent:Y,init:V,push:U,unshift:F,finish:L,sort:N}}function mO(){let $=new WeakMap;function J(Z,Y){let V=$.get(Z),q;if(V===void 0)q=new $K,$.set(Z,[q]);else if(Y>=V.length)q=new $K,V.push(q);else q=V[Y];return q}function Q(){$=new WeakMap}return{get:J,dispose:Q}}function cO(){let $={};return{get:function(J){if($[J.id]!==void 0)return $[J.id];let Q;switch(J.type){case"DirectionalLight":Q={direction:new s,color:new G$};break;case"SpotLight":Q={position:new s,direction:new s,color:new G$,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":Q={position:new s,color:new G$,distance:0,decay:0};break;case"HemisphereLight":Q={direction:new s,skyColor:new G$,groundColor:new G$};break;case"RectAreaLight":Q={color:new G$,position:new s,halfWidth:new s,halfHeight:new s};break}return $[J.id]=Q,Q}}}function oO(){let $={};return{get:function(J){if($[J.id]!==void 0)return $[J.id];let Q;switch(J.type){case"DirectionalLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new O$};break;case"SpotLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new O$};break;case"PointLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new O$,shadowCameraNear:1,shadowCameraFar:1000};break}return $[J.id]=Q,Q}}}function sO($,J){return(J.castShadow?2:0)-($.castShadow?2:0)+(J.map?1:0)-($.map?1:0)}function iO($){let J=new cO,Q=oO(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let N=0;N<9;N++)Z.probe.push(new s);let Y=new s,V=new _$,q=new _$;function U(N){let L=0,I=0,P=0;for(let _=0;_<9;_++)Z.probe[_].set(0,0,0);let C=0,M=0,A=0,R=0,E=0,y=0,G=0,f=0,d=0,g=0,b=0;N.sort(sO);for(let _=0,z=N.length;_<z;_++){let x=N[_],r=x.color,e=x.intensity,Q0=x.distance,J0=x.shadow&&x.shadow.map?x.shadow.map.texture:null;if(x.isAmbientLight)L+=r.r*e,I+=r.g*e,P+=r.b*e;else if(x.isLightProbe){for(let K0=0;K0<9;K0++)Z.probe[K0].addScaledVector(x.sh.coefficients[K0],e);b++}else if(x.isDirectionalLight){let K0=J.get(x);if(K0.color.copy(x.color).multiplyScalar(x.intensity),x.castShadow){let F0=x.shadow,U0=Q.get(x);U0.shadowIntensity=F0.intensity,U0.shadowBias=F0.bias,U0.shadowNormalBias=F0.normalBias,U0.shadowRadius=F0.radius,U0.shadowMapSize=F0.mapSize,Z.directionalShadow[C]=U0,Z.directionalShadowMap[C]=J0,Z.directionalShadowMatrix[C]=x.shadow.matrix,y++}Z.directional[C]=K0,C++}else if(x.isSpotLight){let K0=J.get(x);K0.position.setFromMatrixPosition(x.matrixWorld),K0.color.copy(r).multiplyScalar(e),K0.distance=Q0,K0.coneCos=Math.cos(x.angle),K0.penumbraCos=Math.cos(x.angle*(1-x.penumbra)),K0.decay=x.decay,Z.spot[A]=K0;let F0=x.shadow;if(x.map){if(Z.spotLightMap[d]=x.map,d++,F0.updateMatrices(x),x.castShadow)g++}if(Z.spotLightMatrix[A]=F0.matrix,x.castShadow){let U0=Q.get(x);U0.shadowIntensity=F0.intensity,U0.shadowBias=F0.bias,U0.shadowNormalBias=F0.normalBias,U0.shadowRadius=F0.radius,U0.shadowMapSize=F0.mapSize,Z.spotShadow[A]=U0,Z.spotShadowMap[A]=J0,f++}A++}else if(x.isRectAreaLight){let K0=J.get(x);K0.color.copy(r).multiplyScalar(e),K0.halfWidth.set(x.width*0.5,0,0),K0.halfHeight.set(0,x.height*0.5,0),Z.rectArea[R]=K0,R++}else if(x.isPointLight){let K0=J.get(x);if(K0.color.copy(x.color).multiplyScalar(x.intensity),K0.distance=x.distance,K0.decay=x.decay,x.castShadow){let F0=x.shadow,U0=Q.get(x);U0.shadowIntensity=F0.intensity,U0.shadowBias=F0.bias,U0.shadowNormalBias=F0.normalBias,U0.shadowRadius=F0.radius,U0.shadowMapSize=F0.mapSize,U0.shadowCameraNear=F0.camera.near,U0.shadowCameraFar=F0.camera.far,Z.pointShadow[M]=U0,Z.pointShadowMap[M]=J0,Z.pointShadowMatrix[M]=x.shadow.matrix,G++}Z.point[M]=K0,M++}else if(x.isHemisphereLight){let K0=J.get(x);K0.skyColor.copy(x.color).multiplyScalar(e),K0.groundColor.copy(x.groundColor).multiplyScalar(e),Z.hemi[E]=K0,E++}}if(R>0)if($.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=b0.LTC_FLOAT_1,Z.rectAreaLTC2=b0.LTC_FLOAT_2;else Z.rectAreaLTC1=b0.LTC_HALF_1,Z.rectAreaLTC2=b0.LTC_HALF_2;Z.ambient[0]=L,Z.ambient[1]=I,Z.ambient[2]=P;let o=Z.hash;if(o.directionalLength!==C||o.pointLength!==M||o.spotLength!==A||o.rectAreaLength!==R||o.hemiLength!==E||o.numDirectionalShadows!==y||o.numPointShadows!==G||o.numSpotShadows!==f||o.numSpotMaps!==d||o.numLightProbes!==b)Z.directional.length=C,Z.spot.length=A,Z.rectArea.length=R,Z.point.length=M,Z.hemi.length=E,Z.directionalShadow.length=y,Z.directionalShadowMap.length=y,Z.pointShadow.length=G,Z.pointShadowMap.length=G,Z.spotShadow.length=f,Z.spotShadowMap.length=f,Z.directionalShadowMatrix.length=y,Z.pointShadowMatrix.length=G,Z.spotLightMatrix.length=f+d-g,Z.spotLightMap.length=d,Z.numSpotLightShadowsWithMaps=g,Z.numLightProbes=b,o.directionalLength=C,o.pointLength=M,o.spotLength=A,o.rectAreaLength=R,o.hemiLength=E,o.numDirectionalShadows=y,o.numPointShadows=G,o.numSpotShadows=f,o.numSpotMaps=d,o.numLightProbes=b,Z.version=nO++}function F(N,L){let I=0,P=0,C=0,M=0,A=0,R=L.matrixWorldInverse;for(let E=0,y=N.length;E<y;E++){let G=N[E];if(G.isDirectionalLight){let f=Z.directional[I];f.direction.setFromMatrixPosition(G.matrixWorld),Y.setFromMatrixPosition(G.target.matrixWorld),f.direction.sub(Y),f.direction.transformDirection(R),I++}else if(G.isSpotLight){let f=Z.spot[C];f.position.setFromMatrixPosition(G.matrixWorld),f.position.applyMatrix4(R),f.direction.setFromMatrixPosition(G.matrixWorld),Y.setFromMatrixPosition(G.target.matrixWorld),f.direction.sub(Y),f.direction.transformDirection(R),C++}else if(G.isRectAreaLight){let f=Z.rectArea[M];f.position.setFromMatrixPosition(G.matrixWorld),f.position.applyMatrix4(R),q.identity(),V.copy(G.matrixWorld),V.premultiply(R),q.extractRotation(V),f.halfWidth.set(G.width*0.5,0,0),f.halfHeight.set(0,G.height*0.5,0),f.halfWidth.applyMatrix4(q),f.halfHeight.applyMatrix4(q),M++}else if(G.isPointLight){let f=Z.point[P];f.position.setFromMatrixPosition(G.matrixWorld),f.position.applyMatrix4(R),P++}else if(G.isHemisphereLight){let f=Z.hemi[A];f.direction.setFromMatrixPosition(G.matrixWorld),f.direction.transformDirection(R),A++}}}return{setup:U,setupView:F,state:Z}}function JK($){let J=new iO($),Q=[],Z=[];function Y(L){N.camera=L,Q.length=0,Z.length=0}function V(L){Q.push(L)}function q(L){Z.push(L)}function U(){J.setup(Q)}function F(L){J.setupView(Q,L)}let N={lightsArray:Q,shadowsArray:Z,camera:null,lights:J,transmissionRenderTarget:{}};return{init:Y,state:N,setupLights:U,setupLightsView:F,pushLight:V,pushShadow:q}}function aO($){let J=new WeakMap;function Q(Y,V=0){let q=J.get(Y),U;if(q===void 0)U=new JK($),J.set(Y,[U]);else if(V>=q.length)U=new JK($),q.push(U);else U=q[V];return U}function Z(){J=new WeakMap}return{get:Q,dispose:Z}}function eO($,J,Q){let Z=new CZ,Y=new O$,V=new O$,q=new a$,U=new jK({depthPacking:3201}),F=new CK,N={},L=Q.maxTextureSize,I={[0]:1,[1]:0,[2]:2},P=new N8({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new O$},radius:{value:4}},vertexShader:rO,fragmentShader:tO}),C=P.clone();C.defines.HORIZONTAL_PASS=1;let M=new u9;M.setAttribute("position",new K7(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let A=new V7(M,P),R=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let E=this.type;this.render=function(g,b,o){if(R.enabled===!1)return;if(R.autoUpdate===!1&&R.needsUpdate===!1)return;if(g.length===0)return;let _=$.getRenderTarget(),z=$.getActiveCubeFace(),x=$.getActiveMipmapLevel(),r=$.state;if(r.setBlending(0),r.buffers.depth.getReversed()===!0)r.buffers.color.setClear(0,0,0,0);else r.buffers.color.setClear(1,1,1,1);r.buffers.depth.setTest(!0),r.setScissorTest(!1);let e=E!==3&&this.type===3,Q0=E===3&&this.type!==3;for(let J0=0,K0=g.length;J0<K0;J0++){let F0=g[J0],U0=F0.shadow;if(U0===void 0){console.warn("THREE.WebGLShadowMap:",F0,"has no shadow.");continue}if(U0.autoUpdate===!1&&U0.needsUpdate===!1)continue;Y.copy(U0.mapSize);let C0=U0.getFrameExtents();if(Y.multiply(C0),V.copy(U0.mapSize),Y.x>L||Y.y>L){if(Y.x>L)V.x=Math.floor(L/C0.x),Y.x=V.x*C0.x,U0.mapSize.x=V.x;if(Y.y>L)V.y=Math.floor(L/C0.y),Y.y=V.y*C0.y,U0.mapSize.y=V.y}if(U0.map===null||e===!0||Q0===!0){let e0=this.type!==3?{minFilter:1003,magFilter:1003}:{};if(U0.map!==null)U0.map.dispose();U0.map=new p8(Y.x,Y.y,e0),U0.map.texture.name=F0.name+".shadowMap",U0.camera.updateProjectionMatrix()}$.setRenderTarget(U0.map),$.clear();let x0=U0.getViewportCount();for(let e0=0;e0<x0;e0++){let p0=U0.getViewport(e0);q.set(V.x*p0.x,V.y*p0.y,V.x*p0.z,V.y*p0.w),r.viewport(q),U0.updateMatrices(F0,e0),Z=U0.getFrustum(),f(b,o,U0.camera,F0,this.type)}if(U0.isPointLightShadow!==!0&&this.type===3)y(U0,o);U0.needsUpdate=!1}E=this.type,R.needsUpdate=!1,$.setRenderTarget(_,z,x)};function y(g,b){let o=J.update(A);if(P.defines.VSM_SAMPLES!==g.blurSamples)P.defines.VSM_SAMPLES=g.blurSamples,C.defines.VSM_SAMPLES=g.blurSamples,P.needsUpdate=!0,C.needsUpdate=!0;if(g.mapPass===null)g.mapPass=new p8(Y.x,Y.y);P.uniforms.shadow_pass.value=g.map.texture,P.uniforms.resolution.value=g.mapSize,P.uniforms.radius.value=g.radius,$.setRenderTarget(g.mapPass),$.clear(),$.renderBufferDirect(b,null,o,P,A,null),C.uniforms.shadow_pass.value=g.mapPass.texture,C.uniforms.resolution.value=g.mapSize,C.uniforms.radius.value=g.radius,$.setRenderTarget(g.map),$.clear(),$.renderBufferDirect(b,null,o,C,A,null)}function G(g,b,o,_){let z=null,x=o.isPointLight===!0?g.customDistanceMaterial:g.customDepthMaterial;if(x!==void 0)z=x;else if(z=o.isPointLight===!0?F:U,$.localClippingEnabled&&b.clipShadows===!0&&Array.isArray(b.clippingPlanes)&&b.clippingPlanes.length!==0||b.displacementMap&&b.displacementScale!==0||b.alphaMap&&b.alphaTest>0||b.map&&b.alphaTest>0||b.alphaToCoverage===!0){let r=z.uuid,e=b.uuid,Q0=N[r];if(Q0===void 0)Q0={},N[r]=Q0;let J0=Q0[e];if(J0===void 0)J0=z.clone(),Q0[e]=J0,b.addEventListener("dispose",d);z=J0}if(z.visible=b.visible,z.wireframe=b.wireframe,_===3)z.side=b.shadowSide!==null?b.shadowSide:b.side;else z.side=b.shadowSide!==null?b.shadowSide:I[b.side];if(z.alphaMap=b.alphaMap,z.alphaTest=b.alphaToCoverage===!0?0.5:b.alphaTest,z.map=b.map,z.clipShadows=b.clipShadows,z.clippingPlanes=b.clippingPlanes,z.clipIntersection=b.clipIntersection,z.displacementMap=b.displacementMap,z.displacementScale=b.displacementScale,z.displacementBias=b.displacementBias,z.wireframeLinewidth=b.wireframeLinewidth,z.linewidth=b.linewidth,o.isPointLight===!0&&z.isMeshDistanceMaterial===!0){let r=$.properties.get(z);r.light=o}return z}function f(g,b,o,_,z){if(g.visible===!1)return;if(g.layers.test(b.layers)&&(g.isMesh||g.isLine||g.isPoints)){if((g.castShadow||g.receiveShadow&&z===3)&&(!g.frustumCulled||Z.intersectsObject(g))){g.modelViewMatrix.multiplyMatrices(o.matrixWorldInverse,g.matrixWorld);let e=J.update(g),Q0=g.material;if(Array.isArray(Q0)){let J0=e.groups;for(let K0=0,F0=J0.length;K0<F0;K0++){let U0=J0[K0],C0=Q0[U0.materialIndex];if(C0&&C0.visible){let x0=G(g,C0,_,z);g.onBeforeShadow($,g,b,o,e,x0,U0),$.renderBufferDirect(o,null,e,x0,g,U0),g.onAfterShadow($,g,b,o,e,x0,U0)}}}else if(Q0.visible){let J0=G(g,Q0,_,z);g.onBeforeShadow($,g,b,o,e,J0,null),$.renderBufferDirect(o,null,e,J0,g,null),g.onAfterShadow($,g,b,o,e,J0,null)}}}let r=g.children;for(let e=0,Q0=r.length;e<Q0;e++)f(r[e],b,o,_,z)}function d(g){g.target.removeEventListener("dispose",d);for(let o in N){let _=N[o],z=g.target.uuid;if(z in _)_[z].dispose(),delete _[z]}}}function JL($,J){function Q(){let m=!1,S0=new a$,A0=null,d0=new a$(0,0,0,0);return{setMask:function(P0){if(A0!==P0&&!m)$.colorMask(P0,P0,P0,P0),A0=P0},setLocked:function(P0){m=P0},setClear:function(P0,O0,n0,I$,n$){if(n$===!0)P0*=I$,O0*=I$,n0*=I$;if(S0.set(P0,O0,n0,I$),d0.equals(S0)===!1)$.clearColor(P0,O0,n0,I$),d0.copy(S0)},reset:function(){m=!1,A0=null,d0.set(-1,0,0,0)}}}function Z(){let m=!1,S0=!1,A0=null,d0=null,P0=null;return{setReversed:function(O0){if(S0!==O0){let n0=J.get("EXT_clip_control");if(O0)n0.clipControlEXT(n0.LOWER_LEFT_EXT,n0.ZERO_TO_ONE_EXT);else n0.clipControlEXT(n0.LOWER_LEFT_EXT,n0.NEGATIVE_ONE_TO_ONE_EXT);S0=O0;let I$=P0;P0=null,this.setClear(I$)}},getReversed:function(){return S0},setTest:function(O0){if(O0)D0($.DEPTH_TEST);else t0($.DEPTH_TEST)},setMask:function(O0){if(A0!==O0&&!m)$.depthMask(O0),A0=O0},setFunc:function(O0){if(S0)O0=$L[O0];if(d0!==O0){switch(O0){case 0:$.depthFunc($.NEVER);break;case 1:$.depthFunc($.ALWAYS);break;case 2:$.depthFunc($.LESS);break;case 3:$.depthFunc($.LEQUAL);break;case 4:$.depthFunc($.EQUAL);break;case 5:$.depthFunc($.GEQUAL);break;case 6:$.depthFunc($.GREATER);break;case 7:$.depthFunc($.NOTEQUAL);break;default:$.depthFunc($.LEQUAL)}d0=O0}},setLocked:function(O0){m=O0},setClear:function(O0){if(P0!==O0){if(S0)O0=1-O0;$.clearDepth(O0),P0=O0}},reset:function(){m=!1,A0=null,d0=null,P0=null,S0=!1}}}function Y(){let m=!1,S0=null,A0=null,d0=null,P0=null,O0=null,n0=null,I$=null,n$=null;return{setTest:function(l$){if(!m)if(l$)D0($.STENCIL_TEST);else t0($.STENCIL_TEST)},setMask:function(l$){if(S0!==l$&&!m)$.stencilMask(l$),S0=l$},setFunc:function(l$,Z7,s9){if(A0!==l$||d0!==Z7||P0!==s9)$.stencilFunc(l$,Z7,s9),A0=l$,d0=Z7,P0=s9},setOp:function(l$,Z7,s9){if(O0!==l$||n0!==Z7||I$!==s9)$.stencilOp(l$,Z7,s9),O0=l$,n0=Z7,I$=s9},setLocked:function(l$){m=l$},setClear:function(l$){if(n$!==l$)$.clearStencil(l$),n$=l$},reset:function(){m=!1,S0=null,A0=null,d0=null,P0=null,O0=null,n0=null,I$=null,n$=null}}}let V=new Q,q=new Z,U=new Y,F=new WeakMap,N=new WeakMap,L={},I={},P=new WeakMap,C=[],M=null,A=!1,R=null,E=null,y=null,G=null,f=null,d=null,g=null,b=new G$(0,0,0),o=0,_=!1,z=null,x=null,r=null,e=null,Q0=null,J0=$.getParameter($.MAX_COMBINED_TEXTURE_IMAGE_UNITS),K0=!1,F0=0,U0=$.getParameter($.VERSION);if(U0.indexOf("WebGL")!==-1)F0=parseFloat(/^WebGL (\d)/.exec(U0)[1]),K0=F0>=1;else if(U0.indexOf("OpenGL ES")!==-1)F0=parseFloat(/^OpenGL ES (\d)/.exec(U0)[1]),K0=F0>=2;let C0=null,x0={},e0=$.getParameter($.SCISSOR_BOX),p0=$.getParameter($.VIEWPORT),z$=new a$().fromArray(e0),M$=new a$().fromArray(p0);function B0(m,S0,A0,d0){let P0=new Uint8Array(4),O0=$.createTexture();$.bindTexture(m,O0),$.texParameteri(m,$.TEXTURE_MIN_FILTER,$.NEAREST),$.texParameteri(m,$.TEXTURE_MAG_FILTER,$.NEAREST);for(let n0=0;n0<A0;n0++)if(m===$.TEXTURE_3D||m===$.TEXTURE_2D_ARRAY)$.texImage3D(S0,0,$.RGBA,1,1,d0,0,$.RGBA,$.UNSIGNED_BYTE,P0);else $.texImage2D(S0+n0,0,$.RGBA,1,1,0,$.RGBA,$.UNSIGNED_BYTE,P0);return O0}let w0={};w0[$.TEXTURE_2D]=B0($.TEXTURE_2D,$.TEXTURE_2D,1),w0[$.TEXTURE_CUBE_MAP]=B0($.TEXTURE_CUBE_MAP,$.TEXTURE_CUBE_MAP_POSITIVE_X,6),w0[$.TEXTURE_2D_ARRAY]=B0($.TEXTURE_2D_ARRAY,$.TEXTURE_2D_ARRAY,1,1),w0[$.TEXTURE_3D]=B0($.TEXTURE_3D,$.TEXTURE_3D,1,1),V.setClear(0,0,0,1),q.setClear(1),U.setClear(0),D0($.DEPTH_TEST),q.setFunc(3),i0(!1),b$(1),D0($.CULL_FACE),L$(0);function D0(m){if(L[m]!==!0)$.enable(m),L[m]=!0}function t0(m){if(L[m]!==!1)$.disable(m),L[m]=!1}function N$(m,S0){if(I[m]!==S0){if($.bindFramebuffer(m,S0),I[m]=S0,m===$.DRAW_FRAMEBUFFER)I[$.FRAMEBUFFER]=S0;if(m===$.FRAMEBUFFER)I[$.DRAW_FRAMEBUFFER]=S0;return!0}return!1}function X$(m,S0){let A0=C,d0=!1;if(m){if(A0=P.get(S0),A0===void 0)A0=[],P.set(S0,A0);let P0=m.textures;if(A0.length!==P0.length||A0[0]!==$.COLOR_ATTACHMENT0){for(let O0=0,n0=P0.length;O0<n0;O0++)A0[O0]=$.COLOR_ATTACHMENT0+O0;A0.length=P0.length,d0=!0}}else if(A0[0]!==$.BACK)A0[0]=$.BACK,d0=!0;if(d0)$.drawBuffers(A0)}function I9(m){if(M!==m)return $.useProgram(m),M=m,!0;return!1}let l={[100]:$.FUNC_ADD,[101]:$.FUNC_SUBTRACT,[102]:$.FUNC_REVERSE_SUBTRACT};l[103]=$.MIN,l[104]=$.MAX;let f$={[200]:$.ZERO,[201]:$.ONE,[202]:$.SRC_COLOR,[204]:$.SRC_ALPHA,[210]:$.SRC_ALPHA_SATURATE,[208]:$.DST_COLOR,[206]:$.DST_ALPHA,[203]:$.ONE_MINUS_SRC_COLOR,[205]:$.ONE_MINUS_SRC_ALPHA,[209]:$.ONE_MINUS_DST_COLOR,[207]:$.ONE_MINUS_DST_ALPHA,[211]:$.CONSTANT_COLOR,[212]:$.ONE_MINUS_CONSTANT_COLOR,[213]:$.CONSTANT_ALPHA,[214]:$.ONE_MINUS_CONSTANT_ALPHA};function L$(m,S0,A0,d0,P0,O0,n0,I$,n$,l$){if(m===0){if(A===!0)t0($.BLEND),A=!1;return}if(A===!1)D0($.BLEND),A=!0;if(m!==5){if(m!==R||l$!==_){if(E!==100||f!==100)$.blendEquation($.FUNC_ADD),E=100,f=100;if(l$)switch(m){case 1:$.blendFuncSeparate($.ONE,$.ONE_MINUS_SRC_ALPHA,$.ONE,$.ONE_MINUS_SRC_ALPHA);break;case 2:$.blendFunc($.ONE,$.ONE);break;case 3:$.blendFuncSeparate($.ZERO,$.ONE_MINUS_SRC_COLOR,$.ZERO,$.ONE);break;case 4:$.blendFuncSeparate($.DST_COLOR,$.ONE_MINUS_SRC_ALPHA,$.ZERO,$.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",m);break}else switch(m){case 1:$.blendFuncSeparate($.SRC_ALPHA,$.ONE_MINUS_SRC_ALPHA,$.ONE,$.ONE_MINUS_SRC_ALPHA);break;case 2:$.blendFuncSeparate($.SRC_ALPHA,$.ONE,$.ONE,$.ONE);break;case 3:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case 4:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",m);break}y=null,G=null,d=null,g=null,b.set(0,0,0),o=0,R=m,_=l$}return}if(P0=P0||S0,O0=O0||A0,n0=n0||d0,S0!==E||P0!==f)$.blendEquationSeparate(l[S0],l[P0]),E=S0,f=P0;if(A0!==y||d0!==G||O0!==d||n0!==g)$.blendFuncSeparate(f$[A0],f$[d0],f$[O0],f$[n0]),y=A0,G=d0,d=O0,g=n0;if(I$.equals(b)===!1||n$!==o)$.blendColor(I$.r,I$.g,I$.b,n$),b.copy(I$),o=n$;R=m,_=!1}function q$(m,S0){m.side===2?t0($.CULL_FACE):D0($.CULL_FACE);let A0=m.side===1;if(S0)A0=!A0;i0(A0),m.blending===1&&m.transparent===!1?L$(0):L$(m.blending,m.blendEquation,m.blendSrc,m.blendDst,m.blendEquationAlpha,m.blendSrcAlpha,m.blendDstAlpha,m.blendColor,m.blendAlpha,m.premultipliedAlpha),q.setFunc(m.depthFunc),q.setTest(m.depthTest),q.setMask(m.depthWrite),V.setMask(m.colorWrite);let d0=m.stencilWrite;if(U.setTest(d0),d0)U.setMask(m.stencilWriteMask),U.setFunc(m.stencilFunc,m.stencilRef,m.stencilFuncMask),U.setOp(m.stencilFail,m.stencilZFail,m.stencilZPass);W$(m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits),m.alphaToCoverage===!0?D0($.SAMPLE_ALPHA_TO_COVERAGE):t0($.SAMPLE_ALPHA_TO_COVERAGE)}function i0(m){if(z!==m){if(m)$.frontFace($.CW);else $.frontFace($.CCW);z=m}}function b$(m){if(m!==0){if(D0($.CULL_FACE),m!==x)if(m===1)$.cullFace($.BACK);else if(m===2)$.cullFace($.FRONT);else $.cullFace($.FRONT_AND_BACK)}else t0($.CULL_FACE);x=m}function o0(m){if(m!==r){if(K0)$.lineWidth(m);r=m}}function W$(m,S0,A0){if(m){if(D0($.POLYGON_OFFSET_FILL),e!==S0||Q0!==A0)$.polygonOffset(S0,A0),e=S0,Q0=A0}else t0($.POLYGON_OFFSET_FILL)}function F9(m){if(m)D0($.SCISSOR_TEST);else t0($.SCISSOR_TEST)}function s0(m){if(m===void 0)m=$.TEXTURE0+J0-1;if(C0!==m)$.activeTexture(m),C0=m}function G0(m,S0,A0){if(A0===void 0)if(C0===null)A0=$.TEXTURE0+J0-1;else A0=C0;let d0=x0[A0];if(d0===void 0)d0={type:void 0,texture:void 0},x0[A0]=d0;if(d0.type!==m||d0.texture!==S0){if(C0!==A0)$.activeTexture(A0),C0=A0;$.bindTexture(m,S0||w0[m]),d0.type=m,d0.texture=S0}}function u(){let m=x0[C0];if(m!==void 0&&m.type!==void 0)$.bindTexture(m.type,null),m.type=void 0,m.texture=void 0}function T(){try{$.compressedTexImage2D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function i(){try{$.compressedTexImage3D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function V0(){try{$.texSubImage2D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function n(){try{$.texSubImage3D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function W0(){try{$.compressedTexSubImage2D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function R0(){try{$.compressedTexSubImage3D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function j0(){try{$.texStorage2D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function a0(){try{$.texStorage3D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function U$(){try{$.texImage2D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function L0(){try{$.texImage3D(...arguments)}catch(m){console.error("THREE.WebGLState:",m)}}function _0(m){if(z$.equals(m)===!1)$.scissor(m.x,m.y,m.z,m.w),z$.copy(m)}function l0(m){if(M$.equals(m)===!1)$.viewport(m.x,m.y,m.z,m.w),M$.copy(m)}function r0(m,S0){let A0=N.get(S0);if(A0===void 0)A0=new WeakMap,N.set(S0,A0);let d0=A0.get(m);if(d0===void 0)d0=$.getUniformBlockIndex(S0,m.name),A0.set(m,d0)}function v0(m,S0){let d0=N.get(S0).get(m);if(F.get(S0)!==d0)$.uniformBlockBinding(S0,d0,m.__bindingPointIndex),F.set(S0,d0)}function F$(){$.disable($.BLEND),$.disable($.CULL_FACE),$.disable($.DEPTH_TEST),$.disable($.POLYGON_OFFSET_FILL),$.disable($.SCISSOR_TEST),$.disable($.STENCIL_TEST),$.disable($.SAMPLE_ALPHA_TO_COVERAGE),$.blendEquation($.FUNC_ADD),$.blendFunc($.ONE,$.ZERO),$.blendFuncSeparate($.ONE,$.ZERO,$.ONE,$.ZERO),$.blendColor(0,0,0,0),$.colorMask(!0,!0,!0,!0),$.clearColor(0,0,0,0),$.depthMask(!0),$.depthFunc($.LESS),q.setReversed(!1),$.clearDepth(1),$.stencilMask(4294967295),$.stencilFunc($.ALWAYS,0,4294967295),$.stencilOp($.KEEP,$.KEEP,$.KEEP),$.clearStencil(0),$.cullFace($.BACK),$.frontFace($.CCW),$.polygonOffset(0,0),$.activeTexture($.TEXTURE0),$.bindFramebuffer($.FRAMEBUFFER,null),$.bindFramebuffer($.DRAW_FRAMEBUFFER,null),$.bindFramebuffer($.READ_FRAMEBUFFER,null),$.useProgram(null),$.lineWidth(1),$.scissor(0,0,$.canvas.width,$.canvas.height),$.viewport(0,0,$.canvas.width,$.canvas.height),L={},C0=null,x0={},I={},P=new WeakMap,C=[],M=null,A=!1,R=null,E=null,y=null,G=null,f=null,d=null,g=null,b=new G$(0,0,0),o=0,_=!1,z=null,x=null,r=null,e=null,Q0=null,z$.set(0,0,$.canvas.width,$.canvas.height),M$.set(0,0,$.canvas.width,$.canvas.height),V.reset(),q.reset(),U.reset()}return{buffers:{color:V,depth:q,stencil:U},enable:D0,disable:t0,bindFramebuffer:N$,drawBuffers:X$,useProgram:I9,setBlending:L$,setMaterial:q$,setFlipSided:i0,setCullFace:b$,setLineWidth:o0,setPolygonOffset:W$,setScissorTest:F9,activeTexture:s0,bindTexture:G0,unbindTexture:u,compressedTexImage2D:T,compressedTexImage3D:i,texImage2D:U$,texImage3D:L0,updateUBOMapping:r0,uniformBlockBinding:v0,texStorage2D:j0,texStorage3D:a0,texSubImage2D:V0,texSubImage3D:n,compressedTexSubImage2D:W0,compressedTexSubImage3D:R0,scissor:_0,viewport:l0,reset:F$}}function QL($,J,Q,Z,Y,V,q){let U=J.has("WEBGL_multisampled_render_to_texture")?J.get("WEBGL_multisampled_render_to_texture"):null,F=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),N=new O$,L=new WeakMap,I,P=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(u){}function M(u,T){return C?new OffscreenCanvas(u,T):lJ("canvas")}function A(u,T,i){let V0=1,n=G0(u);if(n.width>i||n.height>i)V0=i/Math.max(n.width,n.height);if(V0<1)if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&u instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&u instanceof ImageBitmap||typeof VideoFrame<"u"&&u instanceof VideoFrame){let W0=Math.floor(V0*n.width),R0=Math.floor(V0*n.height);if(I===void 0)I=M(W0,R0);let j0=T?M(W0,R0):I;return j0.width=W0,j0.height=R0,j0.getContext("2d").drawImage(u,0,0,W0,R0),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+n.width+"x"+n.height+") to ("+W0+"x"+R0+")."),j0}else{if("data"in u)console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+n.width+"x"+n.height+").");return u}return u}function R(u){return u.generateMipmaps}function E(u){$.generateMipmap(u)}function y(u){if(u.isWebGLCubeRenderTarget)return $.TEXTURE_CUBE_MAP;if(u.isWebGL3DRenderTarget)return $.TEXTURE_3D;if(u.isWebGLArrayRenderTarget||u.isCompressedArrayTexture)return $.TEXTURE_2D_ARRAY;return $.TEXTURE_2D}function G(u,T,i,V0,n=!1){if(u!==null){if($[u]!==void 0)return $[u];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+u+"'")}let W0=T;if(T===$.RED){if(i===$.FLOAT)W0=$.R32F;if(i===$.HALF_FLOAT)W0=$.R16F;if(i===$.UNSIGNED_BYTE)W0=$.R8}if(T===$.RED_INTEGER){if(i===$.UNSIGNED_BYTE)W0=$.R8UI;if(i===$.UNSIGNED_SHORT)W0=$.R16UI;if(i===$.UNSIGNED_INT)W0=$.R32UI;if(i===$.BYTE)W0=$.R8I;if(i===$.SHORT)W0=$.R16I;if(i===$.INT)W0=$.R32I}if(T===$.RG){if(i===$.FLOAT)W0=$.RG32F;if(i===$.HALF_FLOAT)W0=$.RG16F;if(i===$.UNSIGNED_BYTE)W0=$.RG8}if(T===$.RG_INTEGER){if(i===$.UNSIGNED_BYTE)W0=$.RG8UI;if(i===$.UNSIGNED_SHORT)W0=$.RG16UI;if(i===$.UNSIGNED_INT)W0=$.RG32UI;if(i===$.BYTE)W0=$.RG8I;if(i===$.SHORT)W0=$.RG16I;if(i===$.INT)W0=$.RG32I}if(T===$.RGB_INTEGER){if(i===$.UNSIGNED_BYTE)W0=$.RGB8UI;if(i===$.UNSIGNED_SHORT)W0=$.RGB16UI;if(i===$.UNSIGNED_INT)W0=$.RGB32UI;if(i===$.BYTE)W0=$.RGB8I;if(i===$.SHORT)W0=$.RGB16I;if(i===$.INT)W0=$.RGB32I}if(T===$.RGBA_INTEGER){if(i===$.UNSIGNED_BYTE)W0=$.RGBA8UI;if(i===$.UNSIGNED_SHORT)W0=$.RGBA16UI;if(i===$.UNSIGNED_INT)W0=$.RGBA32UI;if(i===$.BYTE)W0=$.RGBA8I;if(i===$.SHORT)W0=$.RGBA16I;if(i===$.INT)W0=$.RGBA32I}if(T===$.RGB){if(i===$.UNSIGNED_INT_5_9_9_9_REV)W0=$.RGB9_E5;if(i===$.UNSIGNED_INT_10F_11F_11F_REV)W0=$.R11F_G11F_B10F}if(T===$.RGBA){let R0=n?"linear":o$.getTransfer(V0);if(i===$.FLOAT)W0=$.RGBA32F;if(i===$.HALF_FLOAT)W0=$.RGBA16F;if(i===$.UNSIGNED_BYTE)W0=R0==="srgb"?$.SRGB8_ALPHA8:$.RGBA8;if(i===$.UNSIGNED_SHORT_4_4_4_4)W0=$.RGBA4;if(i===$.UNSIGNED_SHORT_5_5_5_1)W0=$.RGB5_A1}if(W0===$.R16F||W0===$.R32F||W0===$.RG16F||W0===$.RG32F||W0===$.RGBA16F||W0===$.RGBA32F)J.get("EXT_color_buffer_float");return W0}function f(u,T){let i;if(u){if(T===null||T===1014||T===1020)i=$.DEPTH24_STENCIL8;else if(T===1015)i=$.DEPTH32F_STENCIL8;else if(T===1012)i=$.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(T===null||T===1014||T===1020)i=$.DEPTH_COMPONENT24;else if(T===1015)i=$.DEPTH_COMPONENT32F;else if(T===1012)i=$.DEPTH_COMPONENT16;return i}function d(u,T){if(R(u)===!0||u.isFramebufferTexture&&u.minFilter!==1003&&u.minFilter!==1006)return Math.log2(Math.max(T.width,T.height))+1;else if(u.mipmaps!==void 0&&u.mipmaps.length>0)return u.mipmaps.length;else if(u.isCompressedTexture&&Array.isArray(u.image))return T.mipmaps.length;else return 1}function g(u){let T=u.target;if(T.removeEventListener("dispose",g),o(T),T.isVideoTexture)L.delete(T)}function b(u){let T=u.target;T.removeEventListener("dispose",b),z(T)}function o(u){let T=Z.get(u);if(T.__webglInit===void 0)return;let i=u.source,V0=P.get(i);if(V0){let n=V0[T.__cacheKey];if(n.usedTimes--,n.usedTimes===0)_(u);if(Object.keys(V0).length===0)P.delete(i)}Z.remove(u)}function _(u){let T=Z.get(u);$.deleteTexture(T.__webglTexture);let i=u.source,V0=P.get(i);delete V0[T.__cacheKey],q.memory.textures--}function z(u){let T=Z.get(u);if(u.depthTexture)u.depthTexture.dispose(),Z.remove(u.depthTexture);if(u.isWebGLCubeRenderTarget)for(let V0=0;V0<6;V0++){if(Array.isArray(T.__webglFramebuffer[V0]))for(let n=0;n<T.__webglFramebuffer[V0].length;n++)$.deleteFramebuffer(T.__webglFramebuffer[V0][n]);else $.deleteFramebuffer(T.__webglFramebuffer[V0]);if(T.__webglDepthbuffer)$.deleteRenderbuffer(T.__webglDepthbuffer[V0])}else{if(Array.isArray(T.__webglFramebuffer))for(let V0=0;V0<T.__webglFramebuffer.length;V0++)$.deleteFramebuffer(T.__webglFramebuffer[V0]);else $.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer)$.deleteRenderbuffer(T.__webglDepthbuffer);if(T.__webglMultisampledFramebuffer)$.deleteFramebuffer(T.__webglMultisampledFramebuffer);if(T.__webglColorRenderbuffer){for(let V0=0;V0<T.__webglColorRenderbuffer.length;V0++)if(T.__webglColorRenderbuffer[V0])$.deleteRenderbuffer(T.__webglColorRenderbuffer[V0])}if(T.__webglDepthRenderbuffer)$.deleteRenderbuffer(T.__webglDepthRenderbuffer)}let i=u.textures;for(let V0=0,n=i.length;V0<n;V0++){let W0=Z.get(i[V0]);if(W0.__webglTexture)$.deleteTexture(W0.__webglTexture),q.memory.textures--;Z.remove(i[V0])}Z.remove(u)}let x=0;function r(){x=0}function e(){let u=x;if(u>=Y.maxTextures)console.warn("THREE.WebGLTextures: Trying to use "+u+" texture units while this GPU supports only "+Y.maxTextures);return x+=1,u}function Q0(u){let T=[];return T.push(u.wrapS),T.push(u.wrapT),T.push(u.wrapR||0),T.push(u.magFilter),T.push(u.minFilter),T.push(u.anisotropy),T.push(u.internalFormat),T.push(u.format),T.push(u.type),T.push(u.generateMipmaps),T.push(u.premultiplyAlpha),T.push(u.flipY),T.push(u.unpackAlignment),T.push(u.colorSpace),T.join()}function J0(u,T){let i=Z.get(u);if(u.isVideoTexture)F9(u);if(u.isRenderTargetTexture===!1&&u.isExternalTexture!==!0&&u.version>0&&i.__version!==u.version){let V0=u.image;if(V0===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(V0.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{w0(i,u,T);return}}else if(u.isExternalTexture)i.__webglTexture=u.sourceTexture?u.sourceTexture:null;Q.bindTexture($.TEXTURE_2D,i.__webglTexture,$.TEXTURE0+T)}function K0(u,T){let i=Z.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&i.__version!==u.version){w0(i,u,T);return}Q.bindTexture($.TEXTURE_2D_ARRAY,i.__webglTexture,$.TEXTURE0+T)}function F0(u,T){let i=Z.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&i.__version!==u.version){w0(i,u,T);return}Q.bindTexture($.TEXTURE_3D,i.__webglTexture,$.TEXTURE0+T)}function U0(u,T){let i=Z.get(u);if(u.version>0&&i.__version!==u.version){D0(i,u,T);return}Q.bindTexture($.TEXTURE_CUBE_MAP,i.__webglTexture,$.TEXTURE0+T)}let C0={[1000]:$.REPEAT,[1001]:$.CLAMP_TO_EDGE,[1002]:$.MIRRORED_REPEAT},x0={[1003]:$.NEAREST,[1004]:$.NEAREST_MIPMAP_NEAREST,[1005]:$.NEAREST_MIPMAP_LINEAR,[1006]:$.LINEAR,[1007]:$.LINEAR_MIPMAP_NEAREST,[1008]:$.LINEAR_MIPMAP_LINEAR},e0={[512]:$.NEVER,[519]:$.ALWAYS,[513]:$.LESS,[515]:$.LEQUAL,[514]:$.EQUAL,[518]:$.GEQUAL,[516]:$.GREATER,[517]:$.NOTEQUAL};function p0(u,T){if(T.type===1015&&J.has("OES_texture_float_linear")===!1&&(T.magFilter===1006||T.magFilter===1007||T.magFilter===1005||T.magFilter===1008||T.minFilter===1006||T.minFilter===1007||T.minFilter===1005||T.minFilter===1008))console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if($.texParameteri(u,$.TEXTURE_WRAP_S,C0[T.wrapS]),$.texParameteri(u,$.TEXTURE_WRAP_T,C0[T.wrapT]),u===$.TEXTURE_3D||u===$.TEXTURE_2D_ARRAY)$.texParameteri(u,$.TEXTURE_WRAP_R,C0[T.wrapR]);if($.texParameteri(u,$.TEXTURE_MAG_FILTER,x0[T.magFilter]),$.texParameteri(u,$.TEXTURE_MIN_FILTER,x0[T.minFilter]),T.compareFunction)$.texParameteri(u,$.TEXTURE_COMPARE_MODE,$.COMPARE_REF_TO_TEXTURE),$.texParameteri(u,$.TEXTURE_COMPARE_FUNC,e0[T.compareFunction]);if(J.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===1003)return;if(T.minFilter!==1005&&T.minFilter!==1008)return;if(T.type===1015&&J.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||Z.get(T).__currentAnisotropy){let i=J.get("EXT_texture_filter_anisotropic");$.texParameterf(u,i.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,Y.getMaxAnisotropy())),Z.get(T).__currentAnisotropy=T.anisotropy}}}function z$(u,T){let i=!1;if(u.__webglInit===void 0)u.__webglInit=!0,T.addEventListener("dispose",g);let V0=T.source,n=P.get(V0);if(n===void 0)n={},P.set(V0,n);let W0=Q0(T);if(W0!==u.__cacheKey){if(n[W0]===void 0)n[W0]={texture:$.createTexture(),usedTimes:0},q.memory.textures++,i=!0;n[W0].usedTimes++;let R0=n[u.__cacheKey];if(R0!==void 0){if(n[u.__cacheKey].usedTimes--,R0.usedTimes===0)_(T)}u.__cacheKey=W0,u.__webglTexture=n[W0].texture}return i}function M$(u,T,i){return Math.floor(Math.floor(u/i)/T)}function B0(u,T,i,V0){let W0=u.updateRanges;if(W0.length===0)Q.texSubImage2D($.TEXTURE_2D,0,0,0,T.width,T.height,i,V0,T.data);else{W0.sort((L0,_0)=>L0.start-_0.start);let R0=0;for(let L0=1;L0<W0.length;L0++){let _0=W0[R0],l0=W0[L0],r0=_0.start+_0.count,v0=M$(l0.start,T.width,4),F$=M$(_0.start,T.width,4);if(l0.start<=r0+1&&v0===F$&&M$(l0.start+l0.count-1,T.width,4)===v0)_0.count=Math.max(_0.count,l0.start+l0.count-_0.start);else++R0,W0[R0]=l0}W0.length=R0+1;let j0=$.getParameter($.UNPACK_ROW_LENGTH),a0=$.getParameter($.UNPACK_SKIP_PIXELS),U$=$.getParameter($.UNPACK_SKIP_ROWS);$.pixelStorei($.UNPACK_ROW_LENGTH,T.width);for(let L0=0,_0=W0.length;L0<_0;L0++){let l0=W0[L0],r0=Math.floor(l0.start/4),v0=Math.ceil(l0.count/4),F$=r0%T.width,m=Math.floor(r0/T.width),S0=v0,A0=1;$.pixelStorei($.UNPACK_SKIP_PIXELS,F$),$.pixelStorei($.UNPACK_SKIP_ROWS,m),Q.texSubImage2D($.TEXTURE_2D,0,F$,m,S0,1,i,V0,T.data)}u.clearUpdateRanges(),$.pixelStorei($.UNPACK_ROW_LENGTH,j0),$.pixelStorei($.UNPACK_SKIP_PIXELS,a0),$.pixelStorei($.UNPACK_SKIP_ROWS,U$)}}function w0(u,T,i){let V0=$.TEXTURE_2D;if(T.isDataArrayTexture||T.isCompressedArrayTexture)V0=$.TEXTURE_2D_ARRAY;if(T.isData3DTexture)V0=$.TEXTURE_3D;let n=z$(u,T),W0=T.source;Q.bindTexture(V0,u.__webglTexture,$.TEXTURE0+i);let R0=Z.get(W0);if(W0.version!==R0.__version||n===!0){Q.activeTexture($.TEXTURE0+i);let j0=o$.getPrimaries(o$.workingColorSpace),a0=T.colorSpace===""?null:o$.getPrimaries(T.colorSpace),U$=T.colorSpace===""||j0===a0?$.NONE:$.BROWSER_DEFAULT_WEBGL;$.pixelStorei($.UNPACK_FLIP_Y_WEBGL,T.flipY),$.pixelStorei($.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),$.pixelStorei($.UNPACK_ALIGNMENT,T.unpackAlignment),$.pixelStorei($.UNPACK_COLORSPACE_CONVERSION_WEBGL,U$);let L0=A(T.image,!1,Y.maxTextureSize);L0=s0(T,L0);let _0=V.convert(T.format,T.colorSpace),l0=V.convert(T.type),r0=G(T.internalFormat,_0,l0,T.colorSpace,T.isVideoTexture);p0(V0,T);let v0,F$=T.mipmaps,m=T.isVideoTexture!==!0,S0=R0.__version===void 0||n===!0,A0=W0.dataReady,d0=d(T,L0);if(T.isDepthTexture){if(r0=f(T.format===1027,T.type),S0)if(m)Q.texStorage2D($.TEXTURE_2D,1,r0,L0.width,L0.height);else Q.texImage2D($.TEXTURE_2D,0,r0,L0.width,L0.height,0,_0,l0,null)}else if(T.isDataTexture)if(F$.length>0){if(m&&S0)Q.texStorage2D($.TEXTURE_2D,d0,r0,F$[0].width,F$[0].height);for(let P0=0,O0=F$.length;P0<O0;P0++)if(v0=F$[P0],m){if(A0)Q.texSubImage2D($.TEXTURE_2D,P0,0,0,v0.width,v0.height,_0,l0,v0.data)}else Q.texImage2D($.TEXTURE_2D,P0,r0,v0.width,v0.height,0,_0,l0,v0.data);T.generateMipmaps=!1}else if(m){if(S0)Q.texStorage2D($.TEXTURE_2D,d0,r0,L0.width,L0.height);if(A0)B0(T,L0,_0,l0)}else Q.texImage2D($.TEXTURE_2D,0,r0,L0.width,L0.height,0,_0,l0,L0.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){if(m&&S0)Q.texStorage3D($.TEXTURE_2D_ARRAY,d0,r0,F$[0].width,F$[0].height,L0.depth);for(let P0=0,O0=F$.length;P0<O0;P0++)if(v0=F$[P0],T.format!==1023)if(_0!==null)if(m){if(A0)if(T.layerUpdates.size>0){let n0=wV(v0.width,v0.height,T.format,T.type);for(let I$ of T.layerUpdates){let n$=v0.data.subarray(I$*n0/v0.data.BYTES_PER_ELEMENT,(I$+1)*n0/v0.data.BYTES_PER_ELEMENT);Q.compressedTexSubImage3D($.TEXTURE_2D_ARRAY,P0,0,0,I$,v0.width,v0.height,1,_0,n$)}T.clearLayerUpdates()}else Q.compressedTexSubImage3D($.TEXTURE_2D_ARRAY,P0,0,0,0,v0.width,v0.height,L0.depth,_0,v0.data)}else Q.compressedTexImage3D($.TEXTURE_2D_ARRAY,P0,r0,v0.width,v0.height,L0.depth,0,v0.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(m){if(A0)Q.texSubImage3D($.TEXTURE_2D_ARRAY,P0,0,0,0,v0.width,v0.height,L0.depth,_0,l0,v0.data)}else Q.texImage3D($.TEXTURE_2D_ARRAY,P0,r0,v0.width,v0.height,L0.depth,0,_0,l0,v0.data)}else{if(m&&S0)Q.texStorage2D($.TEXTURE_2D,d0,r0,F$[0].width,F$[0].height);for(let P0=0,O0=F$.length;P0<O0;P0++)if(v0=F$[P0],T.format!==1023)if(_0!==null)if(m){if(A0)Q.compressedTexSubImage2D($.TEXTURE_2D,P0,0,0,v0.width,v0.height,_0,v0.data)}else Q.compressedTexImage2D($.TEXTURE_2D,P0,r0,v0.width,v0.height,0,v0.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(m){if(A0)Q.texSubImage2D($.TEXTURE_2D,P0,0,0,v0.width,v0.height,_0,l0,v0.data)}else Q.texImage2D($.TEXTURE_2D,P0,r0,v0.width,v0.height,0,_0,l0,v0.data)}else if(T.isDataArrayTexture)if(m){if(S0)Q.texStorage3D($.TEXTURE_2D_ARRAY,d0,r0,L0.width,L0.height,L0.depth);if(A0)if(T.layerUpdates.size>0){let P0=wV(L0.width,L0.height,T.format,T.type);for(let O0 of T.layerUpdates){let n0=L0.data.subarray(O0*P0/L0.data.BYTES_PER_ELEMENT,(O0+1)*P0/L0.data.BYTES_PER_ELEMENT);Q.texSubImage3D($.TEXTURE_2D_ARRAY,0,0,0,O0,L0.width,L0.height,1,_0,l0,n0)}T.clearLayerUpdates()}else Q.texSubImage3D($.TEXTURE_2D_ARRAY,0,0,0,0,L0.width,L0.height,L0.depth,_0,l0,L0.data)}else Q.texImage3D($.TEXTURE_2D_ARRAY,0,r0,L0.width,L0.height,L0.depth,0,_0,l0,L0.data);else if(T.isData3DTexture)if(m){if(S0)Q.texStorage3D($.TEXTURE_3D,d0,r0,L0.width,L0.height,L0.depth);if(A0)Q.texSubImage3D($.TEXTURE_3D,0,0,0,0,L0.width,L0.height,L0.depth,_0,l0,L0.data)}else Q.texImage3D($.TEXTURE_3D,0,r0,L0.width,L0.height,L0.depth,0,_0,l0,L0.data);else if(T.isFramebufferTexture){if(S0)if(m)Q.texStorage2D($.TEXTURE_2D,d0,r0,L0.width,L0.height);else{let{width:P0,height:O0}=L0;for(let n0=0;n0<d0;n0++)Q.texImage2D($.TEXTURE_2D,n0,r0,P0,O0,0,_0,l0,null),P0>>=1,O0>>=1}}else if(F$.length>0){if(m&&S0){let P0=G0(F$[0]);Q.texStorage2D($.TEXTURE_2D,d0,r0,P0.width,P0.height)}for(let P0=0,O0=F$.length;P0<O0;P0++)if(v0=F$[P0],m){if(A0)Q.texSubImage2D($.TEXTURE_2D,P0,0,0,_0,l0,v0)}else Q.texImage2D($.TEXTURE_2D,P0,r0,_0,l0,v0);T.generateMipmaps=!1}else if(m){if(S0){let P0=G0(L0);Q.texStorage2D($.TEXTURE_2D,d0,r0,P0.width,P0.height)}if(A0)Q.texSubImage2D($.TEXTURE_2D,0,0,0,_0,l0,L0)}else Q.texImage2D($.TEXTURE_2D,0,r0,_0,l0,L0);if(R(T))E(V0);if(R0.__version=W0.version,T.onUpdate)T.onUpdate(T)}u.__version=T.version}function D0(u,T,i){if(T.image.length!==6)return;let V0=z$(u,T),n=T.source;Q.bindTexture($.TEXTURE_CUBE_MAP,u.__webglTexture,$.TEXTURE0+i);let W0=Z.get(n);if(n.version!==W0.__version||V0===!0){Q.activeTexture($.TEXTURE0+i);let R0=o$.getPrimaries(o$.workingColorSpace),j0=T.colorSpace===""?null:o$.getPrimaries(T.colorSpace),a0=T.colorSpace===""||R0===j0?$.NONE:$.BROWSER_DEFAULT_WEBGL;$.pixelStorei($.UNPACK_FLIP_Y_WEBGL,T.flipY),$.pixelStorei($.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),$.pixelStorei($.UNPACK_ALIGNMENT,T.unpackAlignment),$.pixelStorei($.UNPACK_COLORSPACE_CONVERSION_WEBGL,a0);let U$=T.isCompressedTexture||T.image[0].isCompressedTexture,L0=T.image[0]&&T.image[0].isDataTexture,_0=[];for(let O0=0;O0<6;O0++){if(!U$&&!L0)_0[O0]=A(T.image[O0],!0,Y.maxCubemapSize);else _0[O0]=L0?T.image[O0].image:T.image[O0];_0[O0]=s0(T,_0[O0])}let l0=_0[0],r0=V.convert(T.format,T.colorSpace),v0=V.convert(T.type),F$=G(T.internalFormat,r0,v0,T.colorSpace),m=T.isVideoTexture!==!0,S0=W0.__version===void 0||V0===!0,A0=n.dataReady,d0=d(T,l0);p0($.TEXTURE_CUBE_MAP,T);let P0;if(U$){if(m&&S0)Q.texStorage2D($.TEXTURE_CUBE_MAP,d0,F$,l0.width,l0.height);for(let O0=0;O0<6;O0++){P0=_0[O0].mipmaps;for(let n0=0;n0<P0.length;n0++){let I$=P0[n0];if(T.format!==1023)if(r0!==null)if(m){if(A0)Q.compressedTexSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0,0,0,I$.width,I$.height,r0,I$.data)}else Q.compressedTexImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0,F$,I$.width,I$.height,0,I$.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(m){if(A0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0,0,0,I$.width,I$.height,r0,v0,I$.data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0,F$,I$.width,I$.height,0,r0,v0,I$.data)}}}else{if(P0=T.mipmaps,m&&S0){if(P0.length>0)d0++;let O0=G0(_0[0]);Q.texStorage2D($.TEXTURE_CUBE_MAP,d0,F$,O0.width,O0.height)}for(let O0=0;O0<6;O0++)if(L0){if(m){if(A0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,0,0,0,_0[O0].width,_0[O0].height,r0,v0,_0[O0].data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,0,F$,_0[O0].width,_0[O0].height,0,r0,v0,_0[O0].data);for(let n0=0;n0<P0.length;n0++){let n$=P0[n0].image[O0].image;if(m){if(A0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0+1,0,0,n$.width,n$.height,r0,v0,n$.data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0+1,F$,n$.width,n$.height,0,r0,v0,n$.data)}}else{if(m){if(A0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,0,0,0,r0,v0,_0[O0])}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,0,F$,r0,v0,_0[O0]);for(let n0=0;n0<P0.length;n0++){let I$=P0[n0];if(m){if(A0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0+1,0,0,r0,v0,I$.image[O0])}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+O0,n0+1,F$,r0,v0,I$.image[O0])}}}if(R(T))E($.TEXTURE_CUBE_MAP);if(W0.__version=n.version,T.onUpdate)T.onUpdate(T)}u.__version=T.version}function t0(u,T,i,V0,n,W0){let R0=V.convert(i.format,i.colorSpace),j0=V.convert(i.type),a0=G(i.internalFormat,R0,j0,i.colorSpace),U$=Z.get(T),L0=Z.get(i);if(L0.__renderTarget=T,!U$.__hasExternalTextures){let _0=Math.max(1,T.width>>W0),l0=Math.max(1,T.height>>W0);if(n===$.TEXTURE_3D||n===$.TEXTURE_2D_ARRAY)Q.texImage3D(n,W0,a0,_0,l0,T.depth,0,R0,j0,null);else Q.texImage2D(n,W0,a0,_0,l0,0,R0,j0,null)}if(Q.bindFramebuffer($.FRAMEBUFFER,u),W$(T))U.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,V0,n,L0.__webglTexture,0,o0(T));else if(n===$.TEXTURE_2D||n>=$.TEXTURE_CUBE_MAP_POSITIVE_X&&n<=$.TEXTURE_CUBE_MAP_NEGATIVE_Z)$.framebufferTexture2D($.FRAMEBUFFER,V0,n,L0.__webglTexture,W0);Q.bindFramebuffer($.FRAMEBUFFER,null)}function N$(u,T,i){if($.bindRenderbuffer($.RENDERBUFFER,u),T.depthBuffer){let V0=T.depthTexture,n=V0&&V0.isDepthTexture?V0.type:null,W0=f(T.stencilBuffer,n),R0=T.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,j0=o0(T);if(W$(T))U.renderbufferStorageMultisampleEXT($.RENDERBUFFER,j0,W0,T.width,T.height);else if(i)$.renderbufferStorageMultisample($.RENDERBUFFER,j0,W0,T.width,T.height);else $.renderbufferStorage($.RENDERBUFFER,W0,T.width,T.height);$.framebufferRenderbuffer($.FRAMEBUFFER,R0,$.RENDERBUFFER,u)}else{let V0=T.textures;for(let n=0;n<V0.length;n++){let W0=V0[n],R0=V.convert(W0.format,W0.colorSpace),j0=V.convert(W0.type),a0=G(W0.internalFormat,R0,j0,W0.colorSpace),U$=o0(T);if(i&&W$(T)===!1)$.renderbufferStorageMultisample($.RENDERBUFFER,U$,a0,T.width,T.height);else if(W$(T))U.renderbufferStorageMultisampleEXT($.RENDERBUFFER,U$,a0,T.width,T.height);else $.renderbufferStorage($.RENDERBUFFER,a0,T.width,T.height)}}$.bindRenderbuffer($.RENDERBUFFER,null)}function X$(u,T){if(T&&T.isWebGLCubeRenderTarget)throw Error("Depth Texture with cube render targets is not supported");if(Q.bindFramebuffer($.FRAMEBUFFER,u),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let V0=Z.get(T.depthTexture);if(V0.__renderTarget=T,!V0.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0;J0(T.depthTexture,0);let n=V0.__webglTexture,W0=o0(T);if(T.depthTexture.format===1026)if(W$(T))U.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,$.DEPTH_ATTACHMENT,$.TEXTURE_2D,n,0,W0);else $.framebufferTexture2D($.FRAMEBUFFER,$.DEPTH_ATTACHMENT,$.TEXTURE_2D,n,0);else if(T.depthTexture.format===1027)if(W$(T))U.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,$.DEPTH_STENCIL_ATTACHMENT,$.TEXTURE_2D,n,0,W0);else $.framebufferTexture2D($.FRAMEBUFFER,$.DEPTH_STENCIL_ATTACHMENT,$.TEXTURE_2D,n,0);else throw Error("Unknown depthTexture format")}function I9(u){let T=Z.get(u),i=u.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==u.depthTexture){let V0=u.depthTexture;if(T.__depthDisposeCallback)T.__depthDisposeCallback();if(V0){let n=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,V0.removeEventListener("dispose",n)};V0.addEventListener("dispose",n),T.__depthDisposeCallback=n}T.__boundDepthTexture=V0}if(u.depthTexture&&!T.__autoAllocateDepthBuffer){if(i)throw Error("target.depthTexture not supported in Cube render targets");let V0=u.texture.mipmaps;if(V0&&V0.length>0)X$(T.__webglFramebuffer[0],u);else X$(T.__webglFramebuffer,u)}else if(i){T.__webglDepthbuffer=[];for(let V0=0;V0<6;V0++)if(Q.bindFramebuffer($.FRAMEBUFFER,T.__webglFramebuffer[V0]),T.__webglDepthbuffer[V0]===void 0)T.__webglDepthbuffer[V0]=$.createRenderbuffer(),N$(T.__webglDepthbuffer[V0],u,!1);else{let n=u.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,W0=T.__webglDepthbuffer[V0];$.bindRenderbuffer($.RENDERBUFFER,W0),$.framebufferRenderbuffer($.FRAMEBUFFER,n,$.RENDERBUFFER,W0)}}else{let V0=u.texture.mipmaps;if(V0&&V0.length>0)Q.bindFramebuffer($.FRAMEBUFFER,T.__webglFramebuffer[0]);else Q.bindFramebuffer($.FRAMEBUFFER,T.__webglFramebuffer);if(T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=$.createRenderbuffer(),N$(T.__webglDepthbuffer,u,!1);else{let n=u.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,W0=T.__webglDepthbuffer;$.bindRenderbuffer($.RENDERBUFFER,W0),$.framebufferRenderbuffer($.FRAMEBUFFER,n,$.RENDERBUFFER,W0)}}Q.bindFramebuffer($.FRAMEBUFFER,null)}function l(u,T,i){let V0=Z.get(u);if(T!==void 0)t0(V0.__webglFramebuffer,u,u.texture,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,0);if(i!==void 0)I9(u)}function f$(u){let T=u.texture,i=Z.get(u),V0=Z.get(T);u.addEventListener("dispose",b);let n=u.textures,W0=u.isWebGLCubeRenderTarget===!0,R0=n.length>1;if(!R0){if(V0.__webglTexture===void 0)V0.__webglTexture=$.createTexture();V0.__version=T.version,q.memory.textures++}if(W0){i.__webglFramebuffer=[];for(let j0=0;j0<6;j0++)if(T.mipmaps&&T.mipmaps.length>0){i.__webglFramebuffer[j0]=[];for(let a0=0;a0<T.mipmaps.length;a0++)i.__webglFramebuffer[j0][a0]=$.createFramebuffer()}else i.__webglFramebuffer[j0]=$.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){i.__webglFramebuffer=[];for(let j0=0;j0<T.mipmaps.length;j0++)i.__webglFramebuffer[j0]=$.createFramebuffer()}else i.__webglFramebuffer=$.createFramebuffer();if(R0)for(let j0=0,a0=n.length;j0<a0;j0++){let U$=Z.get(n[j0]);if(U$.__webglTexture===void 0)U$.__webglTexture=$.createTexture(),q.memory.textures++}if(u.samples>0&&W$(u)===!1){i.__webglMultisampledFramebuffer=$.createFramebuffer(),i.__webglColorRenderbuffer=[],Q.bindFramebuffer($.FRAMEBUFFER,i.__webglMultisampledFramebuffer);for(let j0=0;j0<n.length;j0++){let a0=n[j0];i.__webglColorRenderbuffer[j0]=$.createRenderbuffer(),$.bindRenderbuffer($.RENDERBUFFER,i.__webglColorRenderbuffer[j0]);let U$=V.convert(a0.format,a0.colorSpace),L0=V.convert(a0.type),_0=G(a0.internalFormat,U$,L0,a0.colorSpace,u.isXRRenderTarget===!0),l0=o0(u);$.renderbufferStorageMultisample($.RENDERBUFFER,l0,_0,u.width,u.height),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+j0,$.RENDERBUFFER,i.__webglColorRenderbuffer[j0])}if($.bindRenderbuffer($.RENDERBUFFER,null),u.depthBuffer)i.__webglDepthRenderbuffer=$.createRenderbuffer(),N$(i.__webglDepthRenderbuffer,u,!0);Q.bindFramebuffer($.FRAMEBUFFER,null)}}if(W0){Q.bindTexture($.TEXTURE_CUBE_MAP,V0.__webglTexture),p0($.TEXTURE_CUBE_MAP,T);for(let j0=0;j0<6;j0++)if(T.mipmaps&&T.mipmaps.length>0)for(let a0=0;a0<T.mipmaps.length;a0++)t0(i.__webglFramebuffer[j0][a0],u,T,$.COLOR_ATTACHMENT0,$.TEXTURE_CUBE_MAP_POSITIVE_X+j0,a0);else t0(i.__webglFramebuffer[j0],u,T,$.COLOR_ATTACHMENT0,$.TEXTURE_CUBE_MAP_POSITIVE_X+j0,0);if(R(T))E($.TEXTURE_CUBE_MAP);Q.unbindTexture()}else if(R0){for(let j0=0,a0=n.length;j0<a0;j0++){let U$=n[j0],L0=Z.get(U$),_0=$.TEXTURE_2D;if(u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)_0=u.isWebGL3DRenderTarget?$.TEXTURE_3D:$.TEXTURE_2D_ARRAY;if(Q.bindTexture(_0,L0.__webglTexture),p0(_0,U$),t0(i.__webglFramebuffer,u,U$,$.COLOR_ATTACHMENT0+j0,_0,0),R(U$))E(_0)}Q.unbindTexture()}else{let j0=$.TEXTURE_2D;if(u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)j0=u.isWebGL3DRenderTarget?$.TEXTURE_3D:$.TEXTURE_2D_ARRAY;if(Q.bindTexture(j0,V0.__webglTexture),p0(j0,T),T.mipmaps&&T.mipmaps.length>0)for(let a0=0;a0<T.mipmaps.length;a0++)t0(i.__webglFramebuffer[a0],u,T,$.COLOR_ATTACHMENT0,j0,a0);else t0(i.__webglFramebuffer,u,T,$.COLOR_ATTACHMENT0,j0,0);if(R(T))E(j0);Q.unbindTexture()}if(u.depthBuffer)I9(u)}function L$(u){let T=u.textures;for(let i=0,V0=T.length;i<V0;i++){let n=T[i];if(R(n)){let W0=y(u),R0=Z.get(n).__webglTexture;Q.bindTexture(W0,R0),E(W0),Q.unbindTexture()}}}let q$=[],i0=[];function b$(u){if(u.samples>0){if(W$(u)===!1){let{textures:T,width:i,height:V0}=u,n=$.COLOR_BUFFER_BIT,W0=u.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,R0=Z.get(u),j0=T.length>1;if(j0)for(let U$=0;U$<T.length;U$++)Q.bindFramebuffer($.FRAMEBUFFER,R0.__webglMultisampledFramebuffer),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+U$,$.RENDERBUFFER,null),Q.bindFramebuffer($.FRAMEBUFFER,R0.__webglFramebuffer),$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0+U$,$.TEXTURE_2D,null,0);Q.bindFramebuffer($.READ_FRAMEBUFFER,R0.__webglMultisampledFramebuffer);let a0=u.texture.mipmaps;if(a0&&a0.length>0)Q.bindFramebuffer($.DRAW_FRAMEBUFFER,R0.__webglFramebuffer[0]);else Q.bindFramebuffer($.DRAW_FRAMEBUFFER,R0.__webglFramebuffer);for(let U$=0;U$<T.length;U$++){if(u.resolveDepthBuffer){if(u.depthBuffer)n|=$.DEPTH_BUFFER_BIT;if(u.stencilBuffer&&u.resolveStencilBuffer)n|=$.STENCIL_BUFFER_BIT}if(j0){$.framebufferRenderbuffer($.READ_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.RENDERBUFFER,R0.__webglColorRenderbuffer[U$]);let L0=Z.get(T[U$]).__webglTexture;$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,L0,0)}if($.blitFramebuffer(0,0,i,V0,0,0,i,V0,n,$.NEAREST),F===!0){if(q$.length=0,i0.length=0,q$.push($.COLOR_ATTACHMENT0+U$),u.depthBuffer&&u.resolveDepthBuffer===!1)q$.push(W0),i0.push(W0),$.invalidateFramebuffer($.DRAW_FRAMEBUFFER,i0);$.invalidateFramebuffer($.READ_FRAMEBUFFER,q$)}}if(Q.bindFramebuffer($.READ_FRAMEBUFFER,null),Q.bindFramebuffer($.DRAW_FRAMEBUFFER,null),j0)for(let U$=0;U$<T.length;U$++){Q.bindFramebuffer($.FRAMEBUFFER,R0.__webglMultisampledFramebuffer),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+U$,$.RENDERBUFFER,R0.__webglColorRenderbuffer[U$]);let L0=Z.get(T[U$]).__webglTexture;Q.bindFramebuffer($.FRAMEBUFFER,R0.__webglFramebuffer),$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0+U$,$.TEXTURE_2D,L0,0)}Q.bindFramebuffer($.DRAW_FRAMEBUFFER,R0.__webglMultisampledFramebuffer)}else if(u.depthBuffer&&u.resolveDepthBuffer===!1&&F){let T=u.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT;$.invalidateFramebuffer($.DRAW_FRAMEBUFFER,[T])}}}function o0(u){return Math.min(Y.maxSamples,u.samples)}function W$(u){let T=Z.get(u);return u.samples>0&&J.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function F9(u){let T=q.render.frame;if(L.get(u)!==T)L.set(u,T),u.update()}function s0(u,T){let{colorSpace:i,format:V0,type:n}=u;if(u.isCompressedTexture===!0||u.isVideoTexture===!0)return T;if(i!=="srgb-linear"&&i!=="")if(o$.getTransfer(i)==="srgb"){if(V0!==1023||n!==1009)console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else console.error("THREE.WebGLTextures: Unsupported texture color space:",i);return T}function G0(u){if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement)N.width=u.naturalWidth||u.width,N.height=u.naturalHeight||u.height;else if(typeof VideoFrame<"u"&&u instanceof VideoFrame)N.width=u.displayWidth,N.height=u.displayHeight;else N.width=u.width,N.height=u.height;return N}this.allocateTextureUnit=e,this.resetTextureUnits=r,this.setTexture2D=J0,this.setTexture2DArray=K0,this.setTexture3D=F0,this.setTextureCube=U0,this.rebindTextures=l,this.setupRenderTarget=f$,this.updateRenderTargetMipmap=L$,this.updateMultisampleRenderTarget=b$,this.setupDepthRenderbuffer=I9,this.setupFrameBufferTexture=t0,this.useMultisampledRTT=W$}function ZL($,J){function Q(Z,Y=""){let V,q=o$.getTransfer(Y);if(Z===1009)return $.UNSIGNED_BYTE;if(Z===1017)return $.UNSIGNED_SHORT_4_4_4_4;if(Z===1018)return $.UNSIGNED_SHORT_5_5_5_1;if(Z===35902)return $.UNSIGNED_INT_5_9_9_9_REV;if(Z===35899)return $.UNSIGNED_INT_10F_11F_11F_REV;if(Z===1010)return $.BYTE;if(Z===1011)return $.SHORT;if(Z===1012)return $.UNSIGNED_SHORT;if(Z===1013)return $.INT;if(Z===1014)return $.UNSIGNED_INT;if(Z===1015)return $.FLOAT;if(Z===1016)return $.HALF_FLOAT;if(Z===1021)return $.ALPHA;if(Z===1022)return $.RGB;if(Z===1023)return $.RGBA;if(Z===1026)return $.DEPTH_COMPONENT;if(Z===1027)return $.DEPTH_STENCIL;if(Z===1028)return $.RED;if(Z===1029)return $.RED_INTEGER;if(Z===1030)return $.RG;if(Z===1031)return $.RG_INTEGER;if(Z===1033)return $.RGBA_INTEGER;if(Z===33776||Z===33777||Z===33778||Z===33779)if(q==="srgb")if(V=J.get("WEBGL_compressed_texture_s3tc_srgb"),V!==null){if(Z===33776)return V.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===33777)return V.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===33778)return V.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===33779)return V.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(V=J.get("WEBGL_compressed_texture_s3tc"),V!==null){if(Z===33776)return V.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===33777)return V.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===33778)return V.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===33779)return V.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===35840||Z===35841||Z===35842||Z===35843)if(V=J.get("WEBGL_compressed_texture_pvrtc"),V!==null){if(Z===35840)return V.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===35841)return V.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===35842)return V.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===35843)return V.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===36196||Z===37492||Z===37496)if(V=J.get("WEBGL_compressed_texture_etc"),V!==null){if(Z===36196||Z===37492)return q==="srgb"?V.COMPRESSED_SRGB8_ETC2:V.COMPRESSED_RGB8_ETC2;if(Z===37496)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:V.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(Z===37808||Z===37809||Z===37810||Z===37811||Z===37812||Z===37813||Z===37814||Z===37815||Z===37816||Z===37817||Z===37818||Z===37819||Z===37820||Z===37821)if(V=J.get("WEBGL_compressed_texture_astc"),V!==null){if(Z===37808)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:V.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===37809)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:V.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===37810)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:V.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===37811)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:V.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===37812)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:V.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===37813)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:V.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===37814)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:V.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===37815)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:V.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===37816)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:V.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===37817)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:V.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===37818)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:V.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===37819)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:V.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===37820)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:V.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===37821)return q==="srgb"?V.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:V.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===36492||Z===36494||Z===36495)if(V=J.get("EXT_texture_compression_bptc"),V!==null){if(Z===36492)return q==="srgb"?V.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:V.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===36494)return V.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===36495)return V.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===36283||Z===36284||Z===36285||Z===36286)if(V=J.get("EXT_texture_compression_rgtc"),V!==null){if(Z===36283)return V.COMPRESSED_RED_RGTC1_EXT;if(Z===36284)return V.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===36285)return V.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===36286)return V.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===1020)return $.UNSIGNED_INT_24_8;return $[Z]!==void 0?$[Z]:null}return{convert:Q}}class XU{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init($,J){if(this.texture===null){let Q=new lX($.texture);if($.depthNear!==J.depthNear||$.depthFar!==J.depthFar)this.depthNear=$.depthNear,this.depthFar=$.depthFar;this.texture=Q}}getMesh($){if(this.texture!==null){if(this.mesh===null){let J=$.cameras[0].viewport,Q=new N8({vertexShader:XL,fragmentShader:WL,uniforms:{depthColor:{value:this.texture},depthWidth:{value:J.z},depthHeight:{value:J.w}}});this.mesh=new V7(new nJ(20,20),Q)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}function VL($,J){function Q(R,E){if(R.matrixAutoUpdate===!0)R.updateMatrix();E.value.copy(R.matrix)}function Z(R,E){if(E.color.getRGB(R.fogColor.value,KK($)),E.isFog)R.fogNear.value=E.near,R.fogFar.value=E.far;else if(E.isFogExp2)R.fogDensity.value=E.density}function Y(R,E,y,G,f){if(E.isMeshBasicMaterial)V(R,E);else if(E.isMeshLambertMaterial)V(R,E);else if(E.isMeshToonMaterial)V(R,E),I(R,E);else if(E.isMeshPhongMaterial)V(R,E),L(R,E);else if(E.isMeshStandardMaterial){if(V(R,E),P(R,E),E.isMeshPhysicalMaterial)C(R,E,f)}else if(E.isMeshMatcapMaterial)V(R,E),M(R,E);else if(E.isMeshDepthMaterial)V(R,E);else if(E.isMeshDistanceMaterial)V(R,E),A(R,E);else if(E.isMeshNormalMaterial)V(R,E);else if(E.isLineBasicMaterial){if(q(R,E),E.isLineDashedMaterial)U(R,E)}else if(E.isPointsMaterial)F(R,E,y,G);else if(E.isSpriteMaterial)N(R,E);else if(E.isShadowMaterial)R.color.value.copy(E.color),R.opacity.value=E.opacity;else if(E.isShaderMaterial)E.uniformsNeedUpdate=!1}function V(R,E){if(R.opacity.value=E.opacity,E.color)R.diffuse.value.copy(E.color);if(E.emissive)R.emissive.value.copy(E.emissive).multiplyScalar(E.emissiveIntensity);if(E.map)R.map.value=E.map,Q(E.map,R.mapTransform);if(E.alphaMap)R.alphaMap.value=E.alphaMap,Q(E.alphaMap,R.alphaMapTransform);if(E.bumpMap){if(R.bumpMap.value=E.bumpMap,Q(E.bumpMap,R.bumpMapTransform),R.bumpScale.value=E.bumpScale,E.side===1)R.bumpScale.value*=-1}if(E.normalMap){if(R.normalMap.value=E.normalMap,Q(E.normalMap,R.normalMapTransform),R.normalScale.value.copy(E.normalScale),E.side===1)R.normalScale.value.negate()}if(E.displacementMap)R.displacementMap.value=E.displacementMap,Q(E.displacementMap,R.displacementMapTransform),R.displacementScale.value=E.displacementScale,R.displacementBias.value=E.displacementBias;if(E.emissiveMap)R.emissiveMap.value=E.emissiveMap,Q(E.emissiveMap,R.emissiveMapTransform);if(E.specularMap)R.specularMap.value=E.specularMap,Q(E.specularMap,R.specularMapTransform);if(E.alphaTest>0)R.alphaTest.value=E.alphaTest;let y=J.get(E),G=y.envMap,f=y.envMapRotation;if(G){if(R.envMap.value=G,u5.copy(f),u5.x*=-1,u5.y*=-1,u5.z*=-1,G.isCubeTexture&&G.isRenderTargetTexture===!1)u5.y*=-1,u5.z*=-1;R.envMapRotation.value.setFromMatrix4(YL.makeRotationFromEuler(u5)),R.flipEnvMap.value=G.isCubeTexture&&G.isRenderTargetTexture===!1?-1:1,R.reflectivity.value=E.reflectivity,R.ior.value=E.ior,R.refractionRatio.value=E.refractionRatio}if(E.lightMap)R.lightMap.value=E.lightMap,R.lightMapIntensity.value=E.lightMapIntensity,Q(E.lightMap,R.lightMapTransform);if(E.aoMap)R.aoMap.value=E.aoMap,R.aoMapIntensity.value=E.aoMapIntensity,Q(E.aoMap,R.aoMapTransform)}function q(R,E){if(R.diffuse.value.copy(E.color),R.opacity.value=E.opacity,E.map)R.map.value=E.map,Q(E.map,R.mapTransform)}function U(R,E){R.dashSize.value=E.dashSize,R.totalSize.value=E.dashSize+E.gapSize,R.scale.value=E.scale}function F(R,E,y,G){if(R.diffuse.value.copy(E.color),R.opacity.value=E.opacity,R.size.value=E.size*y,R.scale.value=G*0.5,E.map)R.map.value=E.map,Q(E.map,R.uvTransform);if(E.alphaMap)R.alphaMap.value=E.alphaMap,Q(E.alphaMap,R.alphaMapTransform);if(E.alphaTest>0)R.alphaTest.value=E.alphaTest}function N(R,E){if(R.diffuse.value.copy(E.color),R.opacity.value=E.opacity,R.rotation.value=E.rotation,E.map)R.map.value=E.map,Q(E.map,R.mapTransform);if(E.alphaMap)R.alphaMap.value=E.alphaMap,Q(E.alphaMap,R.alphaMapTransform);if(E.alphaTest>0)R.alphaTest.value=E.alphaTest}function L(R,E){R.specular.value.copy(E.specular),R.shininess.value=Math.max(E.shininess,0.0001)}function I(R,E){if(E.gradientMap)R.gradientMap.value=E.gradientMap}function P(R,E){if(R.metalness.value=E.metalness,E.metalnessMap)R.metalnessMap.value=E.metalnessMap,Q(E.metalnessMap,R.metalnessMapTransform);if(R.roughness.value=E.roughness,E.roughnessMap)R.roughnessMap.value=E.roughnessMap,Q(E.roughnessMap,R.roughnessMapTransform);if(E.envMap)R.envMapIntensity.value=E.envMapIntensity}function C(R,E,y){if(R.ior.value=E.ior,E.sheen>0){if(R.sheenColor.value.copy(E.sheenColor).multiplyScalar(E.sheen),R.sheenRoughness.value=E.sheenRoughness,E.sheenColorMap)R.sheenColorMap.value=E.sheenColorMap,Q(E.sheenColorMap,R.sheenColorMapTransform);if(E.sheenRoughnessMap)R.sheenRoughnessMap.value=E.sheenRoughnessMap,Q(E.sheenRoughnessMap,R.sheenRoughnessMapTransform)}if(E.clearcoat>0){if(R.clearcoat.value=E.clearcoat,R.clearcoatRoughness.value=E.clearcoatRoughness,E.clearcoatMap)R.clearcoatMap.value=E.clearcoatMap,Q(E.clearcoatMap,R.clearcoatMapTransform);if(E.clearcoatRoughnessMap)R.clearcoatRoughnessMap.value=E.clearcoatRoughnessMap,Q(E.clearcoatRoughnessMap,R.clearcoatRoughnessMapTransform);if(E.clearcoatNormalMap){if(R.clearcoatNormalMap.value=E.clearcoatNormalMap,Q(E.clearcoatNormalMap,R.clearcoatNormalMapTransform),R.clearcoatNormalScale.value.copy(E.clearcoatNormalScale),E.side===1)R.clearcoatNormalScale.value.negate()}}if(E.dispersion>0)R.dispersion.value=E.dispersion;if(E.iridescence>0){if(R.iridescence.value=E.iridescence,R.iridescenceIOR.value=E.iridescenceIOR,R.iridescenceThicknessMinimum.value=E.iridescenceThicknessRange[0],R.iridescenceThicknessMaximum.value=E.iridescenceThicknessRange[1],E.iridescenceMap)R.iridescenceMap.value=E.iridescenceMap,Q(E.iridescenceMap,R.iridescenceMapTransform);if(E.iridescenceThicknessMap)R.iridescenceThicknessMap.value=E.iridescenceThicknessMap,Q(E.iridescenceThicknessMap,R.iridescenceThicknessMapTransform)}if(E.transmission>0){if(R.transmission.value=E.transmission,R.transmissionSamplerMap.value=y.texture,R.transmissionSamplerSize.value.set(y.width,y.height),E.transmissionMap)R.transmissionMap.value=E.transmissionMap,Q(E.transmissionMap,R.transmissionMapTransform);if(R.thickness.value=E.thickness,E.thicknessMap)R.thicknessMap.value=E.thicknessMap,Q(E.thicknessMap,R.thicknessMapTransform);R.attenuationDistance.value=E.attenuationDistance,R.attenuationColor.value.copy(E.attenuationColor)}if(E.anisotropy>0){if(R.anisotropyVector.value.set(E.anisotropy*Math.cos(E.anisotropyRotation),E.anisotropy*Math.sin(E.anisotropyRotation)),E.anisotropyMap)R.anisotropyMap.value=E.anisotropyMap,Q(E.anisotropyMap,R.anisotropyMapTransform)}if(R.specularIntensity.value=E.specularIntensity,R.specularColor.value.copy(E.specularColor),E.specularColorMap)R.specularColorMap.value=E.specularColorMap,Q(E.specularColorMap,R.specularColorMapTransform);if(E.specularIntensityMap)R.specularIntensityMap.value=E.specularIntensityMap,Q(E.specularIntensityMap,R.specularIntensityMapTransform)}function M(R,E){if(E.matcap)R.matcap.value=E.matcap}function A(R,E){let y=J.get(E).light;R.referencePosition.value.setFromMatrixPosition(y.matrixWorld),R.nearDistance.value=y.shadow.camera.near,R.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:Y}}function KL($,J,Q,Z){let Y={},V={},q=[],U=$.getParameter($.MAX_UNIFORM_BUFFER_BINDINGS);function F(y,G){let f=G.program;Z.uniformBlockBinding(y,f)}function N(y,G){let f=Y[y.id];if(f===void 0)M(y),f=L(y),Y[y.id]=f,y.addEventListener("dispose",R);let d=G.program;Z.updateUBOMapping(y,d);let g=J.render.frame;if(V[y.id]!==g)P(y),V[y.id]=g}function L(y){let G=I();y.__bindingPointIndex=G;let f=$.createBuffer(),d=y.__size,g=y.usage;return $.bindBuffer($.UNIFORM_BUFFER,f),$.bufferData($.UNIFORM_BUFFER,d,g),$.bindBuffer($.UNIFORM_BUFFER,null),$.bindBufferBase($.UNIFORM_BUFFER,G,f),f}function I(){for(let y=0;y<U;y++)if(q.indexOf(y)===-1)return q.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function P(y){let G=Y[y.id],f=y.uniforms,d=y.__cache;$.bindBuffer($.UNIFORM_BUFFER,G);for(let g=0,b=f.length;g<b;g++){let o=Array.isArray(f[g])?f[g]:[f[g]];for(let _=0,z=o.length;_<z;_++){let x=o[_];if(C(x,g,_,d)===!0){let r=x.__offset,e=Array.isArray(x.value)?x.value:[x.value],Q0=0;for(let J0=0;J0<e.length;J0++){let K0=e[J0],F0=A(K0);if(typeof K0==="number"||typeof K0==="boolean")x.__data[0]=K0,$.bufferSubData($.UNIFORM_BUFFER,r+Q0,x.__data);else if(K0.isMatrix3)x.__data[0]=K0.elements[0],x.__data[1]=K0.elements[1],x.__data[2]=K0.elements[2],x.__data[3]=0,x.__data[4]=K0.elements[3],x.__data[5]=K0.elements[4],x.__data[6]=K0.elements[5],x.__data[7]=0,x.__data[8]=K0.elements[6],x.__data[9]=K0.elements[7],x.__data[10]=K0.elements[8],x.__data[11]=0;else K0.toArray(x.__data,Q0),Q0+=F0.storage/Float32Array.BYTES_PER_ELEMENT}$.bufferSubData($.UNIFORM_BUFFER,r,x.__data)}}}$.bindBuffer($.UNIFORM_BUFFER,null)}function C(y,G,f,d){let g=y.value,b=G+"_"+f;if(d[b]===void 0){if(typeof g==="number"||typeof g==="boolean")d[b]=g;else d[b]=g.clone();return!0}else{let o=d[b];if(typeof g==="number"||typeof g==="boolean"){if(o!==g)return d[b]=g,!0}else if(o.equals(g)===!1)return o.copy(g),!0}return!1}function M(y){let G=y.uniforms,f=0,d=16;for(let b=0,o=G.length;b<o;b++){let _=Array.isArray(G[b])?G[b]:[G[b]];for(let z=0,x=_.length;z<x;z++){let r=_[z],e=Array.isArray(r.value)?r.value:[r.value];for(let Q0=0,J0=e.length;Q0<J0;Q0++){let K0=e[Q0],F0=A(K0),U0=f%d,C0=U0%F0.boundary,x0=U0+C0;if(f+=C0,x0!==0&&d-x0<F0.storage)f+=d-x0;r.__data=new Float32Array(F0.storage/Float32Array.BYTES_PER_ELEMENT),r.__offset=f,f+=F0.storage}}}let g=f%d;if(g>0)f+=d-g;return y.__size=f,y.__cache={},this}function A(y){let G={boundary:0,storage:0};if(typeof y==="number"||typeof y==="boolean")G.boundary=4,G.storage=4;else if(y.isVector2)G.boundary=8,G.storage=8;else if(y.isVector3||y.isColor)G.boundary=16,G.storage=12;else if(y.isVector4)G.boundary=16,G.storage=16;else if(y.isMatrix3)G.boundary=48,G.storage=48;else if(y.isMatrix4)G.boundary=64,G.storage=64;else if(y.isTexture)console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.");else console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y);return G}function R(y){let G=y.target;G.removeEventListener("dispose",R);let f=q.indexOf(G.__bindingPointIndex);q.splice(f,1),$.deleteBuffer(Y[G.id]),delete Y[G.id],delete V[G.id]}function E(){for(let y in Y)$.deleteBuffer(Y[y]);q=[],Y={},V={}}return{bind:F,update:N,dispose:E}}class YU{constructor($={}){let{canvas:J=c2(),context:Q=null,depth:Z=!0,stencil:Y=!1,alpha:V=!1,antialias:q=!1,premultipliedAlpha:U=!0,preserveDrawingBuffer:F=!1,powerPreference:N="default",failIfMajorPerformanceCaveat:L=!1,reversedDepthBuffer:I=!1}=$;this.isWebGLRenderer=!0;let P;if(Q!==null){if(typeof WebGLRenderingContext<"u"&&Q instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");P=Q.getContextAttributes().alpha}else P=V;let C=new Uint32Array(4),M=new Int32Array(4),A=null,R=null,E=[],y=[];this.domElement=J,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let G=this,f=!1;this._outputColorSpace="srgb";let d=0,g=0,b=null,o=-1,_=null,z=new a$,x=new a$,r=null,e=new G$(0),Q0=0,J0=J.width,K0=J.height,F0=1,U0=null,C0=null,x0=new a$(0,0,J0,K0),e0=new a$(0,0,J0,K0),p0=!1,z$=new CZ,M$=!1,B0=!1,w0=new _$,D0=new s,t0=new a$,N$={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},X$=!1;function I9(){return b===null?F0:1}let l=Q;function f$(w,a){return J.getContext(w,a)}try{let w={alpha:!0,depth:Z,stencil:Y,antialias:q,premultipliedAlpha:U,preserveDrawingBuffer:F,powerPreference:N,failIfMajorPerformanceCaveat:L};if("setAttribute"in J)J.setAttribute("data-engine","three.js r180");if(J.addEventListener("webglcontextlost",S0,!1),J.addEventListener("webglcontextrestored",A0,!1),J.addEventListener("webglcontextcreationerror",d0,!1),l===null){if(l=f$("webgl2",w),l===null)if(f$("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(w){throw console.error("THREE.WebGLRenderer: "+w.message),w}let L$,q$,i0,b$,o0,W$,F9,s0,G0,u,T,i,V0,n,W0,R0,j0,a0,U$,L0,_0,l0,r0,v0;function F$(){if(L$=new v3(l),L$.init(),l0=new ZL(l,L$),q$=new P3(l,L$,$,l0),i0=new JL(l,L$),q$.reversedDepthBuffer&&I)i0.buffers.depth.setReversed(!0);b$=new S3(l),o0=new lO,W$=new QL(l,L$,i0,o0,q$,l0,b$),F9=new E3(G),s0=new M3(G),G0=new fF(l),r0=new I3(l,G0),u=new A3(l,G0,b$,r0),T=new z3(l,u,G0,b$),U$=new k3(l,q$,W$),R0=new G3(o0),i=new pO(G,F9,s0,L$,q$,r0,R0),V0=new VL(G,o0),n=new mO,W0=new aO(L$),a0=new L3(G,F9,s0,i0,T,P,U),j0=new eO(G,T,q$),v0=new KL(l,b$,q$,i0),L0=new D3(l,L$,b$),_0=new T3(l,L$,b$),b$.programs=i.programs,G.capabilities=q$,G.extensions=L$,G.properties=o0,G.renderLists=n,G.shadowMap=j0,G.state=i0,G.info=b$}F$();let m=new WU(G,l);this.xr=m,this.getContext=function(){return l},this.getContextAttributes=function(){return l.getContextAttributes()},this.forceContextLoss=function(){let w=L$.get("WEBGL_lose_context");if(w)w.loseContext()},this.forceContextRestore=function(){let w=L$.get("WEBGL_lose_context");if(w)w.restoreContext()},this.getPixelRatio=function(){return F0},this.setPixelRatio=function(w){if(w===void 0)return;F0=w,this.setSize(J0,K0,!1)},this.getSize=function(w){return w.set(J0,K0)},this.setSize=function(w,a,Z0=!0){if(m.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}if(J0=w,K0=a,J.width=Math.floor(w*F0),J.height=Math.floor(a*F0),Z0===!0)J.style.width=w+"px",J.style.height=a+"px";this.setViewport(0,0,w,a)},this.getDrawingBufferSize=function(w){return w.set(J0*F0,K0*F0).floor()},this.setDrawingBufferSize=function(w,a,Z0){J0=w,K0=a,F0=Z0,J.width=Math.floor(w*Z0),J.height=Math.floor(a*Z0),this.setViewport(0,0,w,a)},this.getCurrentViewport=function(w){return w.copy(z)},this.getViewport=function(w){return w.copy(x0)},this.setViewport=function(w,a,Z0,X0){if(w.isVector4)x0.set(w.x,w.y,w.z,w.w);else x0.set(w,a,Z0,X0);i0.viewport(z.copy(x0).multiplyScalar(F0).round())},this.getScissor=function(w){return w.copy(e0)},this.setScissor=function(w,a,Z0,X0){if(w.isVector4)e0.set(w.x,w.y,w.z,w.w);else e0.set(w,a,Z0,X0);i0.scissor(x.copy(e0).multiplyScalar(F0).round())},this.getScissorTest=function(){return p0},this.setScissorTest=function(w){i0.setScissorTest(p0=w)},this.setOpaqueSort=function(w){U0=w},this.setTransparentSort=function(w){C0=w},this.getClearColor=function(w){return w.copy(a0.getClearColor())},this.setClearColor=function(){a0.setClearColor(...arguments)},this.getClearAlpha=function(){return a0.getClearAlpha()},this.setClearAlpha=function(){a0.setClearAlpha(...arguments)},this.clear=function(w=!0,a=!0,Z0=!0){let X0=0;if(w){let t=!1;if(b!==null){let I0=b.texture.format;t=I0===1033||I0===1031||I0===1029}if(t){let I0=b.texture.type,k0=I0===1009||I0===1014||I0===1012||I0===1020||I0===1017||I0===1018,c0=a0.getClearColor(),g0=a0.getClearAlpha(),H$=c0.r,Y$=c0.g,J$=c0.b;if(k0)C[0]=H$,C[1]=Y$,C[2]=J$,C[3]=g0,l.clearBufferuiv(l.COLOR,0,C);else M[0]=H$,M[1]=Y$,M[2]=J$,M[3]=g0,l.clearBufferiv(l.COLOR,0,M)}else X0|=l.COLOR_BUFFER_BIT}if(a)X0|=l.DEPTH_BUFFER_BIT;if(Z0)X0|=l.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);l.clear(X0)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){J.removeEventListener("webglcontextlost",S0,!1),J.removeEventListener("webglcontextrestored",A0,!1),J.removeEventListener("webglcontextcreationerror",d0,!1),a0.dispose(),n.dispose(),W0.dispose(),o0.dispose(),F9.dispose(),s0.dispose(),T.dispose(),r0.dispose(),v0.dispose(),i.dispose(),m.dispose(),m.removeEventListener("sessionstart",Z7),m.removeEventListener("sessionend",s9),J8.stop()};function S0(w){w.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),f=!0}function A0(){console.log("THREE.WebGLRenderer: Context Restored."),f=!1;let w=b$.autoReset,a=j0.enabled,Z0=j0.autoUpdate,X0=j0.needsUpdate,t=j0.type;F$(),b$.autoReset=w,j0.enabled=a,j0.autoUpdate=Z0,j0.needsUpdate=X0,j0.type=t}function d0(w){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function P0(w){let a=w.target;a.removeEventListener("dispose",P0),O0(a)}function O0(w){n0(w),o0.remove(w)}function n0(w){let a=o0.get(w).programs;if(a!==void 0){if(a.forEach(function(Z0){i.releaseProgram(Z0)}),w.isShaderMaterial)i.releaseShaderCache(w)}}this.renderBufferDirect=function(w,a,Z0,X0,t,I0){if(a===null)a=N$;let k0=t.isMesh&&t.matrixWorld.determinant()<0,c0=q9(w,a,Z0,X0,t);i0.setMaterial(X0,k0);let g0=Z0.index,H$=1;if(X0.wireframe===!0){if(g0=u.getWireframeAttribute(Z0),g0===void 0)return;H$=2}let Y$=Z0.drawRange,J$=Z0.attributes.position,D$=Y$.start*H$,g$=(Y$.start+Y$.count)*H$;if(I0!==null)D$=Math.max(D$,I0.start*H$),g$=Math.min(g$,(I0.start+I0.count)*H$);if(g0!==null)D$=Math.max(D$,0),g$=Math.min(g$,g0.count);else if(J$!==void 0&&J$!==null)D$=Math.max(D$,0),g$=Math.min(g$,J$.count);let e$=g$-D$;if(e$<0||e$===1/0)return;r0.setup(t,X0,c0,Z0,g0);let S$,d$=L0;if(g0!==null)S$=G0.get(g0),d$=_0,d$.setIndex(S$);if(t.isMesh)if(X0.wireframe===!0)i0.setLineWidth(X0.wireframeLinewidth*I9()),d$.setMode(l.LINES);else d$.setMode(l.TRIANGLES);else if(t.isLine){let $$=X0.linewidth;if($$===void 0)$$=1;if(i0.setLineWidth($$*I9()),t.isLineSegments)d$.setMode(l.LINES);else if(t.isLineLoop)d$.setMode(l.LINE_LOOP);else d$.setMode(l.LINE_STRIP)}else if(t.isPoints)d$.setMode(l.POINTS);else if(t.isSprite)d$.setMode(l.TRIANGLES);if(t.isBatchedMesh)if(t._multiDrawInstances!==null)dJ("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),d$.renderMultiDrawInstances(t._multiDrawStarts,t._multiDrawCounts,t._multiDrawCount,t._multiDrawInstances);else if(!L$.get("WEBGL_multi_draw")){let{_multiDrawStarts:$$,_multiDrawCounts:p$,_multiDrawCount:u$}=t,G9=g0?G0.get(g0).bytesPerElement:1,y7=o0.get(X0).currentProgram.getUniforms();for(let v9=0;v9<u$;v9++)y7.setValue(l,"_gl_DrawID",v9),d$.render($$[v9]/G9,p$[v9])}else d$.renderMultiDraw(t._multiDrawStarts,t._multiDrawCounts,t._multiDrawCount);else if(t.isInstancedMesh)d$.renderInstances(D$,e$,t.count);else if(Z0.isInstancedBufferGeometry){let $$=Z0._maxInstanceCount!==void 0?Z0._maxInstanceCount:1/0,p$=Math.min(Z0.instanceCount,$$);d$.renderInstances(D$,e$,p$)}else d$.render(D$,e$)};function I$(w,a,Z0){if(w.transparent===!0&&w.side===2&&w.forceSinglePass===!1)w.side=1,w.needsUpdate=!0,P8(w,a,Z0),w.side=0,w.needsUpdate=!0,P8(w,a,Z0),w.side=2;else P8(w,a,Z0)}this.compile=function(w,a,Z0=null){if(Z0===null)Z0=w;if(R=W0.get(Z0),R.init(a),y.push(R),Z0.traverseVisible(function(t){if(t.isLight&&t.layers.test(a.layers)){if(R.pushLight(t),t.castShadow)R.pushShadow(t)}}),w!==Z0)w.traverseVisible(function(t){if(t.isLight&&t.layers.test(a.layers)){if(R.pushLight(t),t.castShadow)R.pushShadow(t)}});R.setupLights();let X0=new Set;return w.traverse(function(t){if(!(t.isMesh||t.isPoints||t.isLine||t.isSprite))return;let I0=t.material;if(I0)if(Array.isArray(I0))for(let k0=0;k0<I0.length;k0++){let c0=I0[k0];I$(c0,Z0,t),X0.add(c0)}else I$(I0,Z0,t),X0.add(I0)}),R=y.pop(),X0},this.compileAsync=function(w,a,Z0=null){let X0=this.compile(w,a,Z0);return new Promise((t)=>{function I0(){if(X0.forEach(function(k0){if(o0.get(k0).currentProgram.isReady())X0.delete(k0)}),X0.size===0){t(w);return}setTimeout(I0,10)}if(L$.get("KHR_parallel_shader_compile")!==null)I0();else setTimeout(I0,10)})};let n$=null;function l$(w){if(n$)n$(w)}function Z7(){J8.stop()}function s9(){J8.start()}let J8=new sK;if(J8.setAnimationLoop(l$),typeof self<"u")J8.setContext(self);this.setAnimationLoop=function(w){n$=w,m.setAnimationLoop(w),w===null?J8.stop():J8.start()},m.addEventListener("sessionstart",Z7),m.addEventListener("sessionend",s9),this.render=function(w,a){if(a!==void 0&&a.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(f===!0)return;if(w.matrixWorldAutoUpdate===!0)w.updateMatrixWorld();if(a.parent===null&&a.matrixWorldAutoUpdate===!0)a.updateMatrixWorld();if(m.enabled===!0&&m.isPresenting===!0){if(m.cameraAutoUpdate===!0)m.updateCamera(a);a=m.getCamera()}if(w.isScene===!0)w.onBeforeRender(G,w,a,b);if(R=W0.get(w,y.length),R.init(a),y.push(R),w0.multiplyMatrices(a.projectionMatrix,a.matrixWorldInverse),z$.setFromProjectionMatrix(w0,2000,a.reversedDepth),B0=this.localClippingEnabled,M$=R0.init(this.clippingPlanes,B0),A=n.get(w,E.length),A.init(),E.push(A),m.enabled===!0&&m.isPresenting===!0){let I0=G.xr.getDepthSensingMesh();if(I0!==null)E5(I0,a,-1/0,G.sortObjects)}if(E5(w,a,0,G.sortObjects),A.finish(),G.sortObjects===!0)A.sort(U0,C0);if(X$=m.enabled===!1||m.isPresenting===!1||m.hasDepthSensing()===!1,X$)a0.addToRenderList(A,w);if(this.info.render.frame++,M$===!0)R0.beginShadows();let Z0=R.state.shadowsArray;if(j0.render(Z0,w,a),M$===!0)R0.endShadows();if(this.info.autoReset===!0)this.info.reset();let{opaque:X0,transmissive:t}=A;if(R.setupLights(),a.isArrayCamera){let I0=a.cameras;if(t.length>0)for(let k0=0,c0=I0.length;k0<c0;k0++){let g0=I0[k0];X7(X0,t,w,g0)}if(X$)a0.render(w);for(let k0=0,c0=I0.length;k0<c0;k0++){let g0=I0[k0];h9(A,w,g0,g0.viewport)}}else{if(t.length>0)X7(X0,t,w,a);if(X$)a0.render(w);h9(A,w,a)}if(b!==null&&g===0)W$.updateMultisampleRenderTarget(b),W$.updateRenderTargetMipmap(b);if(w.isScene===!0)w.onAfterRender(G,w,a);if(r0.resetDefaultState(),o=-1,_=null,y.pop(),y.length>0){if(R=y[y.length-1],M$===!0)R0.setGlobalState(G.clippingPlanes,R.state.camera)}else R=null;if(E.pop(),E.length>0)A=E[E.length-1];else A=null};function E5(w,a,Z0,X0){if(w.visible===!1)return;if(w.layers.test(a.layers)){if(w.isGroup)Z0=w.renderOrder;else if(w.isLOD){if(w.autoUpdate===!0)w.update(a)}else if(w.isLight){if(R.pushLight(w),w.castShadow)R.pushShadow(w)}else if(w.isSprite){if(!w.frustumCulled||z$.intersectsSprite(w)){if(X0)t0.setFromMatrixPosition(w.matrixWorld).applyMatrix4(w0);let k0=T.update(w),c0=w.material;if(c0.visible)A.push(w,k0,c0,Z0,t0.z,null)}}else if(w.isMesh||w.isLine||w.isPoints){if(!w.frustumCulled||z$.intersectsObject(w)){let k0=T.update(w),c0=w.material;if(X0){if(w.boundingSphere!==void 0){if(w.boundingSphere===null)w.computeBoundingSphere();t0.copy(w.boundingSphere.center)}else{if(k0.boundingSphere===null)k0.computeBoundingSphere();t0.copy(k0.boundingSphere.center)}t0.applyMatrix4(w.matrixWorld).applyMatrix4(w0)}if(Array.isArray(c0)){let g0=k0.groups;for(let H$=0,Y$=g0.length;H$<Y$;H$++){let J$=g0[H$],D$=c0[J$.materialIndex];if(D$&&D$.visible)A.push(w,k0,D$,Z0,t0.z,J$)}}else if(c0.visible)A.push(w,k0,c0,Z0,t0.z,null)}}}let I0=w.children;for(let k0=0,c0=I0.length;k0<c0;k0++)E5(I0[k0],a,Z0,X0)}function h9(w,a,Z0,X0){let{opaque:t,transmissive:I0,transparent:k0}=w;if(R.setupLightsView(Z0),M$===!0)R0.setGlobalState(G.clippingPlanes,Z0);if(X0)i0.viewport(z.copy(X0));if(t.length>0)i9(t,a,Z0);if(I0.length>0)i9(I0,a,Z0);if(k0.length>0)i9(k0,a,Z0);i0.buffers.depth.setTest(!0),i0.buffers.depth.setMask(!0),i0.buffers.color.setMask(!0),i0.setPolygonOffset(!1)}function X7(w,a,Z0,X0){if((Z0.isScene===!0?Z0.overrideMaterial:null)!==null)return;if(R.state.transmissionRenderTarget[X0.id]===void 0)R.state.transmissionRenderTarget[X0.id]=new p8(1,1,{generateMipmaps:!0,type:L$.has("EXT_color_buffer_half_float")||L$.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:Y,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:o$.workingColorSpace});let I0=R.state.transmissionRenderTarget[X0.id],k0=X0.viewport||z;I0.setSize(k0.z*G.transmissionResolutionScale,k0.w*G.transmissionResolutionScale);let c0=G.getRenderTarget(),g0=G.getActiveCubeFace(),H$=G.getActiveMipmapLevel();if(G.setRenderTarget(I0),G.getClearColor(e),Q0=G.getClearAlpha(),Q0<1)G.setClearColor(16777215,0.5);if(G.clear(),X$)a0.render(Z0);let Y$=G.toneMapping;G.toneMapping=0;let J$=X0.viewport;if(X0.viewport!==void 0)X0.viewport=void 0;if(R.setupLightsView(X0),M$===!0)R0.setGlobalState(G.clippingPlanes,X0);if(i9(w,Z0,X0),W$.updateMultisampleRenderTarget(I0),W$.updateRenderTargetMipmap(I0),L$.has("WEBGL_multisampled_render_to_texture")===!1){let D$=!1;for(let g$=0,e$=a.length;g$<e$;g$++){let S$=a[g$],d$=S$.object,$$=S$.geometry,p$=S$.material,u$=S$.group;if(p$.side===2&&d$.layers.test(X0.layers)){let G9=p$.side;p$.side=1,p$.needsUpdate=!0,r5(d$,Z0,X0,$$,p$,u$),p$.side=G9,p$.needsUpdate=!0,D$=!0}}if(D$===!0)W$.updateMultisampleRenderTarget(I0),W$.updateRenderTargetMipmap(I0)}if(G.setRenderTarget(c0,g0,H$),G.setClearColor(e,Q0),J$!==void 0)X0.viewport=J$;G.toneMapping=Y$}function i9(w,a,Z0){let X0=a.isScene===!0?a.overrideMaterial:null;for(let t=0,I0=w.length;t<I0;t++){let k0=w[t],c0=k0.object,g0=k0.geometry,H$=k0.group,Y$=k0.material;if(Y$.allowOverride===!0&&X0!==null)Y$=X0;if(c0.layers.test(Z0.layers))r5(c0,a,Z0,g0,Y$,H$)}}function r5(w,a,Z0,X0,t,I0){if(w.onBeforeRender(G,a,Z0,X0,t,I0),w.modelViewMatrix.multiplyMatrices(Z0.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),t.onBeforeRender(G,a,Z0,X0,w,I0),t.transparent===!0&&t.side===2&&t.forceSinglePass===!1)t.side=1,t.needsUpdate=!0,G.renderBufferDirect(Z0,a,X0,t,w,I0),t.side=0,t.needsUpdate=!0,G.renderBufferDirect(Z0,a,X0,t,w,I0),t.side=2;else G.renderBufferDirect(Z0,a,X0,t,w,I0);w.onAfterRender(G,a,Z0,X0,t,I0)}function P8(w,a,Z0){if(a.isScene!==!0)a=N$;let X0=o0.get(w),t=R.state.lights,I0=R.state.shadowsArray,k0=t.state.version,c0=i.getParameters(w,t.state,I0,a,Z0),g0=i.getProgramCacheKey(c0),H$=X0.programs;if(X0.environment=w.isMeshStandardMaterial?a.environment:null,X0.fog=a.fog,X0.envMap=(w.isMeshStandardMaterial?s0:F9).get(w.envMap||X0.environment),X0.envMapRotation=X0.environment!==null&&w.envMap===null?a.environmentRotation:w.envMapRotation,H$===void 0)w.addEventListener("dispose",P0),H$=new Map,X0.programs=H$;let Y$=H$.get(g0);if(Y$!==void 0){if(X0.currentProgram===Y$&&X0.lightsStateVersion===k0)return t5(w,c0),Y$}else c0.uniforms=i.getUniforms(w),w.onBeforeCompile(c0,G),Y$=i.acquireProgram(c0,g0),H$.set(g0,Y$),X0.uniforms=c0.uniforms;let J$=X0.uniforms;if(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)J$.clippingPlanes=R0.uniform;if(t5(w,c0),X0.needsLights=a9(w),X0.lightsStateVersion=k0,X0.needsLights)J$.ambientLightColor.value=t.state.ambient,J$.lightProbe.value=t.state.probe,J$.directionalLights.value=t.state.directional,J$.directionalLightShadows.value=t.state.directionalShadow,J$.spotLights.value=t.state.spot,J$.spotLightShadows.value=t.state.spotShadow,J$.rectAreaLights.value=t.state.rectArea,J$.ltc_1.value=t.state.rectAreaLTC1,J$.ltc_2.value=t.state.rectAreaLTC2,J$.pointLights.value=t.state.point,J$.pointLightShadows.value=t.state.pointShadow,J$.hemisphereLights.value=t.state.hemi,J$.directionalShadowMap.value=t.state.directionalShadowMap,J$.directionalShadowMatrix.value=t.state.directionalShadowMatrix,J$.spotShadowMap.value=t.state.spotShadowMap,J$.spotLightMatrix.value=t.state.spotLightMatrix,J$.spotLightMap.value=t.state.spotLightMap,J$.pointShadowMap.value=t.state.pointShadowMap,J$.pointShadowMatrix.value=t.state.pointShadowMatrix;return X0.currentProgram=Y$,X0.uniformsList=null,Y$}function JJ(w){if(w.uniformsList===null){let a=w.currentProgram.getUniforms();w.uniformsList=pJ.seqWithValue(a.seq,w.uniforms)}return w.uniformsList}function t5(w,a){let Z0=o0.get(w);Z0.outputColorSpace=a.outputColorSpace,Z0.batching=a.batching,Z0.batchingColor=a.batchingColor,Z0.instancing=a.instancing,Z0.instancingColor=a.instancingColor,Z0.instancingMorph=a.instancingMorph,Z0.skinning=a.skinning,Z0.morphTargets=a.morphTargets,Z0.morphNormals=a.morphNormals,Z0.morphColors=a.morphColors,Z0.morphTargetsCount=a.morphTargetsCount,Z0.numClippingPlanes=a.numClippingPlanes,Z0.numIntersection=a.numClipIntersection,Z0.vertexAlphas=a.vertexAlphas,Z0.vertexTangents=a.vertexTangents,Z0.toneMapping=a.toneMapping}function q9(w,a,Z0,X0,t){if(a.isScene!==!0)a=N$;W$.resetTextureUnits();let I0=a.fog,k0=X0.isMeshStandardMaterial?a.environment:null,c0=b===null?G.outputColorSpace:b.isXRRenderTarget===!0?b.texture.colorSpace:"srgb-linear",g0=(X0.isMeshStandardMaterial?s0:F9).get(X0.envMap||k0),H$=X0.vertexColors===!0&&!!Z0.attributes.color&&Z0.attributes.color.itemSize===4,Y$=!!Z0.attributes.tangent&&(!!X0.normalMap||X0.anisotropy>0),J$=!!Z0.morphAttributes.position,D$=!!Z0.morphAttributes.normal,g$=!!Z0.morphAttributes.color,e$=0;if(X0.toneMapped){if(b===null||b.isXRRenderTarget===!0)e$=G.toneMapping}let S$=Z0.morphAttributes.position||Z0.morphAttributes.normal||Z0.morphAttributes.color,d$=S$!==void 0?S$.length:0,$$=o0.get(X0),p$=R.state.lights;if(M$===!0){if(B0===!0||w!==_){let A9=w===_&&X0.id===o;R0.setState(X0,w,A9)}}let u$=!1;if(X0.version===$$.__version){if($$.needsLights&&$$.lightsStateVersion!==p$.state.version)u$=!0;else if($$.outputColorSpace!==c0)u$=!0;else if(t.isBatchedMesh&&$$.batching===!1)u$=!0;else if(!t.isBatchedMesh&&$$.batching===!0)u$=!0;else if(t.isBatchedMesh&&$$.batchingColor===!0&&t.colorTexture===null)u$=!0;else if(t.isBatchedMesh&&$$.batchingColor===!1&&t.colorTexture!==null)u$=!0;else if(t.isInstancedMesh&&$$.instancing===!1)u$=!0;else if(!t.isInstancedMesh&&$$.instancing===!0)u$=!0;else if(t.isSkinnedMesh&&$$.skinning===!1)u$=!0;else if(!t.isSkinnedMesh&&$$.skinning===!0)u$=!0;else if(t.isInstancedMesh&&$$.instancingColor===!0&&t.instanceColor===null)u$=!0;else if(t.isInstancedMesh&&$$.instancingColor===!1&&t.instanceColor!==null)u$=!0;else if(t.isInstancedMesh&&$$.instancingMorph===!0&&t.morphTexture===null)u$=!0;else if(t.isInstancedMesh&&$$.instancingMorph===!1&&t.morphTexture!==null)u$=!0;else if($$.envMap!==g0)u$=!0;else if(X0.fog===!0&&$$.fog!==I0)u$=!0;else if($$.numClippingPlanes!==void 0&&($$.numClippingPlanes!==R0.numPlanes||$$.numIntersection!==R0.numIntersection))u$=!0;else if($$.vertexAlphas!==H$)u$=!0;else if($$.vertexTangents!==Y$)u$=!0;else if($$.morphTargets!==J$)u$=!0;else if($$.morphNormals!==D$)u$=!0;else if($$.morphColors!==g$)u$=!0;else if($$.toneMapping!==e$)u$=!0;else if($$.morphTargetsCount!==d$)u$=!0}else u$=!0,$$.__version=X0.version;let G9=$$.currentProgram;if(u$===!0)G9=P8(X0,a,t);let y7=!1,v9=!1,U7=!1,Z9=G9.getUniforms(),O9=$$.uniforms;if(i0.useProgram(G9.program))y7=!0,v9=!0,U7=!0;if(X0.id!==o)o=X0.id,v9=!0;if(y7||_!==w){if(i0.buffers.depth.getReversed()&&w.reversedDepth!==!0)w._reversedDepth=!0,w.updateProjectionMatrix();Z9.setValue(l,"projectionMatrix",w.projectionMatrix),Z9.setValue(l,"viewMatrix",w.matrixWorldInverse);let _9=Z9.map.cameraPosition;if(_9!==void 0)_9.setValue(l,D0.setFromMatrixPosition(w.matrixWorld));if(q$.logarithmicDepthBuffer)Z9.setValue(l,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2));if(X0.isMeshPhongMaterial||X0.isMeshToonMaterial||X0.isMeshLambertMaterial||X0.isMeshBasicMaterial||X0.isMeshStandardMaterial||X0.isShaderMaterial)Z9.setValue(l,"isOrthographic",w.isOrthographicCamera===!0);if(_!==w)_=w,v9=!0,U7=!0}if(t.isSkinnedMesh){Z9.setOptional(l,t,"bindMatrix"),Z9.setOptional(l,t,"bindMatrixInverse");let A9=t.skeleton;if(A9){if(A9.boneTexture===null)A9.computeBoneTexture();Z9.setValue(l,"boneTexture",A9.boneTexture,W$)}}if(t.isBatchedMesh){if(Z9.setOptional(l,t,"batchingTexture"),Z9.setValue(l,"batchingTexture",t._matricesTexture,W$),Z9.setOptional(l,t,"batchingIdTexture"),Z9.setValue(l,"batchingIdTexture",t._indirectTexture,W$),Z9.setOptional(l,t,"batchingColorTexture"),t._colorsTexture!==null)Z9.setValue(l,"batchingColorTexture",t._colorsTexture,W$)}let V9=Z0.morphAttributes;if(V9.position!==void 0||V9.normal!==void 0||V9.color!==void 0)U$.update(t,Z0,G9);if(v9||$$.receiveShadow!==t.receiveShadow)$$.receiveShadow=t.receiveShadow,Z9.setValue(l,"receiveShadow",t.receiveShadow);if(X0.isMeshGouraudMaterial&&X0.envMap!==null)O9.envMap.value=g0,O9.flipEnvMap.value=g0.isCubeTexture&&g0.isRenderTargetTexture===!1?-1:1;if(X0.isMeshStandardMaterial&&X0.envMap===null&&a.environment!==null)O9.envMapIntensity.value=a.environmentIntensity;if(v9){if(Z9.setValue(l,"toneMappingExposure",G.toneMappingExposure),$$.needsLights)WQ(O9,U7);if(I0&&X0.fog===!0)V0.refreshFogUniforms(O9,I0);V0.refreshMaterialUniforms(O9,X0,F0,K0,R.state.transmissionRenderTarget[w.id]),pJ.upload(l,JJ($$),O9,W$)}if(X0.isShaderMaterial&&X0.uniformsNeedUpdate===!0)pJ.upload(l,JJ($$),O9,W$),X0.uniformsNeedUpdate=!1;if(X0.isSpriteMaterial)Z9.setValue(l,"center",t.center);if(Z9.setValue(l,"modelViewMatrix",t.modelViewMatrix),Z9.setValue(l,"normalMatrix",t.normalMatrix),Z9.setValue(l,"modelMatrix",t.matrixWorld),X0.isShaderMaterial||X0.isRawShaderMaterial){let A9=X0.uniformsGroups;for(let _9=0,r9=A9.length;_9<r9;_9++){let I7=A9[_9];v0.update(I7,G9),v0.bind(I7,G9)}}return G9}function WQ(w,a){w.ambientLightColor.needsUpdate=a,w.lightProbe.needsUpdate=a,w.directionalLights.needsUpdate=a,w.directionalLightShadows.needsUpdate=a,w.pointLights.needsUpdate=a,w.pointLightShadows.needsUpdate=a,w.spotLights.needsUpdate=a,w.spotLightShadows.needsUpdate=a,w.rectAreaLights.needsUpdate=a,w.hemisphereLights.needsUpdate=a}function a9(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return d},this.getActiveMipmapLevel=function(){return g},this.getRenderTarget=function(){return b},this.setRenderTargetTextures=function(w,a,Z0){let X0=o0.get(w);if(X0.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,X0.__autoAllocateDepthBuffer===!1)X0.__useRenderToTexture=!1;o0.get(w.texture).__webglTexture=a,o0.get(w.depthTexture).__webglTexture=X0.__autoAllocateDepthBuffer?void 0:Z0,X0.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,a){let Z0=o0.get(w);Z0.__webglFramebuffer=a,Z0.__useDefaultFramebuffer=a===void 0};let QJ=l.createFramebuffer();this.setRenderTarget=function(w,a=0,Z0=0){b=w,d=a,g=Z0;let X0=!0,t=null,I0=!1,k0=!1;if(w){let g0=o0.get(w);if(g0.__useDefaultFramebuffer!==void 0)i0.bindFramebuffer(l.FRAMEBUFFER,null),X0=!1;else if(g0.__webglFramebuffer===void 0)W$.setupRenderTarget(w);else if(g0.__hasExternalTextures)W$.rebindTextures(w,o0.get(w.texture).__webglTexture,o0.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){let J$=w.depthTexture;if(g0.__boundDepthTexture!==J$){if(J$!==null&&o0.has(J$)&&(w.width!==J$.image.width||w.height!==J$.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");W$.setupDepthRenderbuffer(w)}}let H$=w.texture;if(H$.isData3DTexture||H$.isDataArrayTexture||H$.isCompressedArrayTexture)k0=!0;let Y$=o0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget){if(Array.isArray(Y$[a]))t=Y$[a][Z0];else t=Y$[a];I0=!0}else if(w.samples>0&&W$.useMultisampledRTT(w)===!1)t=o0.get(w).__webglMultisampledFramebuffer;else if(Array.isArray(Y$))t=Y$[Z0];else t=Y$;z.copy(w.viewport),x.copy(w.scissor),r=w.scissorTest}else z.copy(x0).multiplyScalar(F0).floor(),x.copy(e0).multiplyScalar(F0).floor(),r=p0;if(Z0!==0)t=QJ;if(i0.bindFramebuffer(l.FRAMEBUFFER,t)&&X0)i0.drawBuffers(w,t);if(i0.viewport(z),i0.scissor(x),i0.setScissorTest(r),I0){let g0=o0.get(w.texture);l.framebufferTexture2D(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+a,g0.__webglTexture,Z0)}else if(k0){let g0=a;for(let H$=0;H$<w.textures.length;H$++){let Y$=o0.get(w.textures[H$]);l.framebufferTextureLayer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+H$,Y$.__webglTexture,Z0,g0)}}else if(w!==null&&Z0!==0){let g0=o0.get(w.texture);l.framebufferTexture2D(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,g0.__webglTexture,Z0)}o=-1},this.readRenderTargetPixels=function(w,a,Z0,X0,t,I0,k0,c0=0){if(!(w&&w.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let g0=o0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&k0!==void 0)g0=g0[k0];if(g0){i0.bindFramebuffer(l.FRAMEBUFFER,g0);try{let H$=w.textures[c0],Y$=H$.format,J$=H$.type;if(!q$.textureFormatReadable(Y$)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!q$.textureTypeReadable(J$)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(a>=0&&a<=w.width-X0&&(Z0>=0&&Z0<=w.height-t)){if(w.textures.length>1)l.readBuffer(l.COLOR_ATTACHMENT0+c0);l.readPixels(a,Z0,X0,t,l0.convert(Y$),l0.convert(J$),I0)}}finally{let H$=b!==null?o0.get(b).__webglFramebuffer:null;i0.bindFramebuffer(l.FRAMEBUFFER,H$)}}},this.readRenderTargetPixelsAsync=async function(w,a,Z0,X0,t,I0,k0,c0=0){if(!(w&&w.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let g0=o0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&k0!==void 0)g0=g0[k0];if(g0)if(a>=0&&a<=w.width-X0&&(Z0>=0&&Z0<=w.height-t)){i0.bindFramebuffer(l.FRAMEBUFFER,g0);let H$=w.textures[c0],Y$=H$.format,J$=H$.type;if(!q$.textureFormatReadable(Y$))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!q$.textureTypeReadable(J$))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let D$=l.createBuffer();if(l.bindBuffer(l.PIXEL_PACK_BUFFER,D$),l.bufferData(l.PIXEL_PACK_BUFFER,I0.byteLength,l.STREAM_READ),w.textures.length>1)l.readBuffer(l.COLOR_ATTACHMENT0+c0);l.readPixels(a,Z0,X0,t,l0.convert(Y$),l0.convert(J$),0);let g$=b!==null?o0.get(b).__webglFramebuffer:null;i0.bindFramebuffer(l.FRAMEBUFFER,g$);let e$=l.fenceSync(l.SYNC_GPU_COMMANDS_COMPLETE,0);return l.flush(),await o2(l,e$,4),l.bindBuffer(l.PIXEL_PACK_BUFFER,D$),l.getBufferSubData(l.PIXEL_PACK_BUFFER,0,I0),l.deleteBuffer(D$),l.deleteSync(e$),I0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,a=null,Z0=0){let X0=Math.pow(2,-Z0),t=Math.floor(w.image.width*X0),I0=Math.floor(w.image.height*X0),k0=a!==null?a.x:0,c0=a!==null?a.y:0;W$.setTexture2D(w,0),l.copyTexSubImage2D(l.TEXTURE_2D,Z0,0,0,k0,c0,t,I0),i0.unbindTexture()};let G8=l.createFramebuffer(),Q8=l.createFramebuffer();if(this.copyTextureToTexture=function(w,a,Z0=null,X0=null,t=0,I0=null){if(I0===null)if(t!==0)dJ("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),I0=t,t=0;else I0=0;let k0,c0,g0,H$,Y$,J$,D$,g$,e$,S$=w.isCompressedTexture?w.mipmaps[I0]:w.image;if(Z0!==null)k0=Z0.max.x-Z0.min.x,c0=Z0.max.y-Z0.min.y,g0=Z0.isBox3?Z0.max.z-Z0.min.z:1,H$=Z0.min.x,Y$=Z0.min.y,J$=Z0.isBox3?Z0.min.z:0;else{let V9=Math.pow(2,-t);if(k0=Math.floor(S$.width*V9),c0=Math.floor(S$.height*V9),w.isDataArrayTexture)g0=S$.depth;else if(w.isData3DTexture)g0=Math.floor(S$.depth*V9);else g0=1;H$=0,Y$=0,J$=0}if(X0!==null)D$=X0.x,g$=X0.y,e$=X0.z;else D$=0,g$=0,e$=0;let d$=l0.convert(a.format),$$=l0.convert(a.type),p$;if(a.isData3DTexture)W$.setTexture3D(a,0),p$=l.TEXTURE_3D;else if(a.isDataArrayTexture||a.isCompressedArrayTexture)W$.setTexture2DArray(a,0),p$=l.TEXTURE_2D_ARRAY;else W$.setTexture2D(a,0),p$=l.TEXTURE_2D;l.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,a.flipY),l.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),l.pixelStorei(l.UNPACK_ALIGNMENT,a.unpackAlignment);let u$=l.getParameter(l.UNPACK_ROW_LENGTH),G9=l.getParameter(l.UNPACK_IMAGE_HEIGHT),y7=l.getParameter(l.UNPACK_SKIP_PIXELS),v9=l.getParameter(l.UNPACK_SKIP_ROWS),U7=l.getParameter(l.UNPACK_SKIP_IMAGES);l.pixelStorei(l.UNPACK_ROW_LENGTH,S$.width),l.pixelStorei(l.UNPACK_IMAGE_HEIGHT,S$.height),l.pixelStorei(l.UNPACK_SKIP_PIXELS,H$),l.pixelStorei(l.UNPACK_SKIP_ROWS,Y$),l.pixelStorei(l.UNPACK_SKIP_IMAGES,J$);let Z9=w.isDataArrayTexture||w.isData3DTexture,O9=a.isDataArrayTexture||a.isData3DTexture;if(w.isDepthTexture){let V9=o0.get(w),A9=o0.get(a),_9=o0.get(V9.__renderTarget),r9=o0.get(A9.__renderTarget);i0.bindFramebuffer(l.READ_FRAMEBUFFER,_9.__webglFramebuffer),i0.bindFramebuffer(l.DRAW_FRAMEBUFFER,r9.__webglFramebuffer);for(let I7=0;I7<g0;I7++){if(Z9)l.framebufferTextureLayer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,o0.get(w).__webglTexture,t,J$+I7),l.framebufferTextureLayer(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,o0.get(a).__webglTexture,I0,e$+I7);l.blitFramebuffer(H$,Y$,k0,c0,D$,g$,k0,c0,l.DEPTH_BUFFER_BIT,l.NEAREST)}i0.bindFramebuffer(l.READ_FRAMEBUFFER,null),i0.bindFramebuffer(l.DRAW_FRAMEBUFFER,null)}else if(t!==0||w.isRenderTargetTexture||o0.has(w)){let V9=o0.get(w),A9=o0.get(a);i0.bindFramebuffer(l.READ_FRAMEBUFFER,G8),i0.bindFramebuffer(l.DRAW_FRAMEBUFFER,Q8);for(let _9=0;_9<g0;_9++){if(Z9)l.framebufferTextureLayer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,V9.__webglTexture,t,J$+_9);else l.framebufferTexture2D(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,V9.__webglTexture,t);if(O9)l.framebufferTextureLayer(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,A9.__webglTexture,I0,e$+_9);else l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,A9.__webglTexture,I0);if(t!==0)l.blitFramebuffer(H$,Y$,k0,c0,D$,g$,k0,c0,l.COLOR_BUFFER_BIT,l.NEAREST);else if(O9)l.copyTexSubImage3D(p$,I0,D$,g$,e$+_9,H$,Y$,k0,c0);else l.copyTexSubImage2D(p$,I0,D$,g$,H$,Y$,k0,c0)}i0.bindFramebuffer(l.READ_FRAMEBUFFER,null),i0.bindFramebuffer(l.DRAW_FRAMEBUFFER,null)}else if(O9)if(w.isDataTexture||w.isData3DTexture)l.texSubImage3D(p$,I0,D$,g$,e$,k0,c0,g0,d$,$$,S$.data);else if(a.isCompressedArrayTexture)l.compressedTexSubImage3D(p$,I0,D$,g$,e$,k0,c0,g0,d$,S$.data);else l.texSubImage3D(p$,I0,D$,g$,e$,k0,c0,g0,d$,$$,S$);else if(w.isDataTexture)l.texSubImage2D(l.TEXTURE_2D,I0,D$,g$,k0,c0,d$,$$,S$.data);else if(w.isCompressedTexture)l.compressedTexSubImage2D(l.TEXTURE_2D,I0,D$,g$,S$.width,S$.height,d$,S$.data);else l.texSubImage2D(l.TEXTURE_2D,I0,D$,g$,k0,c0,d$,$$,S$);if(l.pixelStorei(l.UNPACK_ROW_LENGTH,u$),l.pixelStorei(l.UNPACK_IMAGE_HEIGHT,G9),l.pixelStorei(l.UNPACK_SKIP_PIXELS,y7),l.pixelStorei(l.UNPACK_SKIP_ROWS,v9),l.pixelStorei(l.UNPACK_SKIP_IMAGES,U7),I0===0&&a.generateMipmaps)l.generateMipmap(p$);i0.unbindTexture()},this.initRenderTarget=function(w){if(o0.get(w).__webglFramebuffer===void 0)W$.setupRenderTarget(w)},this.initTexture=function(w){if(w.isCubeTexture)W$.setTextureCube(w,0);else if(w.isData3DTexture)W$.setTexture3D(w,0);else if(w.isDataArrayTexture||w.isCompressedArrayTexture)W$.setTexture2DArray(w,0);else W$.setTexture2D(w,0);i0.unbindTexture()},this.resetState=function(){d=0,g=0,b=null,i0.reset(),r0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2000}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace($){this._outputColorSpace=$;let J=this.getContext();J.drawingBufferColorSpace=o$._getDrawingBufferColorSpace($),J.unpackColorSpace=o$._getUnpackColorSpace()}}var c9,sY=1234567,gJ,_6,m2,O$,N5,s,m4,iY,c4,aY,rY,tY,o$,H6,s2=0,i2=0,n4,b9,a$,XK,p8,TX,WK,w8,s7,lQ,F6,B6,N6,V5,K5,f5,AJ,dQ,mQ,b5,a2,TJ,i4,_8,a4,cQ,U5,r4,oQ,t4,O6,i7,r2,t2,q5,nQ,N7,eY,$V,e7,e2=0,JV,L6,y8,sQ,SJ,$F,JF,QV,ZV,XV,WV,QF,I6,e4,N9,a7,f8,$X,b8,D6,P6,YV,JX,QX,ZX,XX,WX,YX,YK,H5,iQ,G$,o9,ZF=0,T7,jZ,x8,C9,aQ,VF=0,kX,zX,U9,KF=0,v7,KX,G6,O7,kJ,f9,u9,VV,h5,rQ,KV,tQ,eQ,$Z,UX,JZ,UV,QZ,V7,h6,HF,FF=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,BF=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,N8,wX,F5,qV,HV,Q7,E6=-90,R6=1,UK,_X,qK,k6,NF,HK,$7,bX,j6,zJ,C6,M6,v6,wJ,FK,XZ,_J,WZ,FV,qX,BV,BK,NV,OV,LV,OF,IV,VZ,HX,DV,FX,NK,hX,oJ,PV,LF,PZ,A6,GV,KZ,EV,IF,yJ,fJ,OK,BX,DF,PF,x5,GF,UZ,gX,GZ,EZ,RV,bJ,qZ,NX,jV,MZ,CV,MV,LK,IK,uX,vV,CX,FZ,BZ,DK,PK,pX,lX,dX,vZ,mX,cX,oX,nJ,nX,sX,iX,GK,EK,RK,jK,CK,vK,AK,TK,m5,aX,f6,SK,g6,c5,b6,g8,MF,h8,wK,rX,T6,_K,yK,fK,sJ,OX,SV,kV,bK,hK,zV,hJ,LX,xK,gK,TZ,uK,pK,lK,mK,IX,cK,oK,tX="\\[\\]\\.:\\/",vF,eX,AF,TF,SF,kF,zF,wF,_F,RL,bF=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,hF=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,xF=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,gF=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,uF=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,pF=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,lF=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,dF=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,mF=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,cF=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,oF=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,nF=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,sF=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iF=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,aF=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,rF=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,tF=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,eF=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,$B=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,JB=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,QB=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,ZB=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,XB=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,WB=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,YB=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,VB=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,KB=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,UB=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,qB=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,HB=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,FB="gl_FragColor = linearToOutputTexel( gl_FragColor );",BB=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,NB=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,OB=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,LB=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,IB=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,DB=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,PB=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,GB=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,EB=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,RB=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,jB=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,CB=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,MB=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,vB=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,AB=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,TB=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,SB=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,kB=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,zB=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,wB=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,_B=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,yB=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,fB=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,bB=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,hB=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,xB=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,gB=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,uB=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pB=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,lB=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,dB=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,mB=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,cB=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,oB=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,nB=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,sB=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,iB=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,aB=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,rB=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,tB=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,eB=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,$N=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,JN=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,QN=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ZN=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,XN=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,WN=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,YN=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,VN=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,KN=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,UN=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,qN=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,HN=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,FN=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,BN=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,NN=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ON=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,LN=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,IN=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,DN=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,PN=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,GN=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,EN=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,RN=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,jN=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,CN=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,MN=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,vN=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,AN=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,TN=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,SN=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,kN=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,zN=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wN=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,_N=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,yN=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,fN=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,bN=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hN=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,xN=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,gN=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,uN=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pN=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,lN=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,dN=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,mN=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,cN=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,oN=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nN=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sN=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,iN=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,aN=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,rN=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,tN=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,eN=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,$3=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,J3=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Q3=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Z3=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,X3=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,W3=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Y3=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,V3=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,K3=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,U3=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,q3=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,H3=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,F3=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,B3=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,N3=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,T$,b0,B8,OZ,g5,O3,z6=4,_V,l5=20,DX,yV,PX=null,GX=0,EX=0,RX=!1,p5,S6,fV,R3,iK,gV,aK,rK,tK,uV,pV,lV,dV,mV,jX,PO=37297,GO=0,nV,IZ,SO,kO,wO,uO=0,nO=0,rO=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,tO=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`,$L,XL=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,WL=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,WU,u5,YL,p6=4,JW,QW,ZW,l6,X9,z9,p9,l8,kZ,d6=1001,y$,zZ,d8,Q9,o5,XW,m6,iJ,m8=2,c6=303,wZ,n5,aJ=1015,_Z,WW=0,t$,c8=1016,YW,VW,L5,yZ,r$,fZ,bZ,KW,UW=2300,hZ=2301,qW,o6,HW,n6,w9=1006,xZ=1008,FW=1007,n9="srgb-linear",BW,s5,rJ,NW,L8,T0,Y9,gZ,k7,s6,uZ,OW=1002,I5=1003,LW=1005,IW=1004,pZ=0,lZ,o8,tJ,dZ=2,eJ,L7,$Q,z7,w7,DW,i5,mZ,i6=1028,JQ=1000,I8="srgb",cZ,n8,PW,GW,EW,D5,RW,a6,r6,t6,jW,oZ,e6=2,QQ=1,CW=0,P5,M9,nZ,sZ,MW;var ZQ=pQ(()=>{c9=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],gJ=Math.PI/180,_6=180/Math.PI;m2={DEG2RAD:gJ,RAD2DEG:_6,generateUUID:t7,clamp:w$,euclideanModulo:AX,mapLinear:T2,inverseLerp:S2,lerp:uJ,damp:k2,pingpong:z2,smoothstep:w2,smootherstep:_2,randInt:y2,randFloat:f2,randFloatSpread:b2,seededRandom:h2,degToRad:x2,radToDeg:g2,isPowerOfTwo:u2,ceilPowerOfTwo:p2,floorPowerOfTwo:l2,setQuaternionFromProperEuler:d2,normalize:$9,denormalize:r7};O$=class O${constructor($=0,J=0){O$.prototype.isVector2=!0,this.x=$,this.y=J}get width(){return this.x}set width($){this.x=$}get height(){return this.y}set height($){this.y=$}set($,J){return this.x=$,this.y=J,this}setScalar($){return this.x=$,this.y=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y)}copy($){return this.x=$.x,this.y=$.y,this}add($){return this.x+=$.x,this.y+=$.y,this}addScalar($){return this.x+=$,this.y+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this}sub($){return this.x-=$.x,this.y-=$.y,this}subScalar($){return this.x-=$,this.y-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this}multiply($){return this.x*=$.x,this.y*=$.y,this}multiplyScalar($){return this.x*=$,this.y*=$,this}divide($){return this.x/=$.x,this.y/=$.y,this}divideScalar($){return this.multiplyScalar(1/$)}applyMatrix3($){let J=this.x,Q=this.y,Z=$.elements;return this.x=Z[0]*J+Z[3]*Q+Z[6],this.y=Z[1]*J+Z[4]*Q+Z[7],this}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this}clamp($,J){return this.x=w$(this.x,$.x,J.x),this.y=w$(this.y,$.y,J.y),this}clampScalar($,J){return this.x=w$(this.x,$,J),this.y=w$(this.y,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(w$(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot($){return this.x*$.x+this.y*$.y}cross($){return this.x*$.y-this.y*$.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo($){let J=Math.sqrt(this.lengthSq()*$.lengthSq());if(J===0)return Math.PI/2;let Q=this.dot($)/J;return Math.acos(w$(Q,-1,1))}distanceTo($){return Math.sqrt(this.distanceToSquared($))}distanceToSquared($){let J=this.x-$.x,Q=this.y-$.y;return J*J+Q*Q}manhattanDistanceTo($){return Math.abs(this.x-$.x)+Math.abs(this.y-$.y)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this}equals($){return $.x===this.x&&$.y===this.y}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this}rotateAround($,J){let Q=Math.cos(J),Z=Math.sin(J),Y=this.x-$.x,V=this.y-$.y;return this.x=Y*Q-V*Z+$.x,this.y=Y*Z+V*Q+$.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};N5=class N5{constructor($=0,J=0,Q=0,Z=1){this.isQuaternion=!0,this._x=$,this._y=J,this._z=Q,this._w=Z}static slerpFlat($,J,Q,Z,Y,V,q){let U=Q[Z+0],F=Q[Z+1],N=Q[Z+2],L=Q[Z+3],I=Y[V+0],P=Y[V+1],C=Y[V+2],M=Y[V+3];if(q===0){$[J+0]=U,$[J+1]=F,$[J+2]=N,$[J+3]=L;return}if(q===1){$[J+0]=I,$[J+1]=P,$[J+2]=C,$[J+3]=M;return}if(L!==M||U!==I||F!==P||N!==C){let A=1-q,R=U*I+F*P+N*C+L*M,E=R>=0?1:-1,y=1-R*R;if(y>Number.EPSILON){let f=Math.sqrt(y),d=Math.atan2(f,R*E);A=Math.sin(A*d)/f,q=Math.sin(q*d)/f}let G=q*E;if(U=U*A+I*G,F=F*A+P*G,N=N*A+C*G,L=L*A+M*G,A===1-q){let f=1/Math.sqrt(U*U+F*F+N*N+L*L);U*=f,F*=f,N*=f,L*=f}}$[J]=U,$[J+1]=F,$[J+2]=N,$[J+3]=L}static multiplyQuaternionsFlat($,J,Q,Z,Y,V){let q=Q[Z],U=Q[Z+1],F=Q[Z+2],N=Q[Z+3],L=Y[V],I=Y[V+1],P=Y[V+2],C=Y[V+3];return $[J]=q*C+N*L+U*P-F*I,$[J+1]=U*C+N*I+F*L-q*P,$[J+2]=F*C+N*P+q*I-U*L,$[J+3]=N*C-q*L-U*I-F*P,$}get x(){return this._x}set x($){this._x=$,this._onChangeCallback()}get y(){return this._y}set y($){this._y=$,this._onChangeCallback()}get z(){return this._z}set z($){this._z=$,this._onChangeCallback()}get w(){return this._w}set w($){this._w=$,this._onChangeCallback()}set($,J,Q,Z){return this._x=$,this._y=J,this._z=Q,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy($){return this._x=$.x,this._y=$.y,this._z=$.z,this._w=$.w,this._onChangeCallback(),this}setFromEuler($,J=!0){let{_x:Q,_y:Z,_z:Y,_order:V}=$,q=Math.cos,U=Math.sin,F=q(Q/2),N=q(Z/2),L=q(Y/2),I=U(Q/2),P=U(Z/2),C=U(Y/2);switch(V){case"XYZ":this._x=I*N*L+F*P*C,this._y=F*P*L-I*N*C,this._z=F*N*C+I*P*L,this._w=F*N*L-I*P*C;break;case"YXZ":this._x=I*N*L+F*P*C,this._y=F*P*L-I*N*C,this._z=F*N*C-I*P*L,this._w=F*N*L+I*P*C;break;case"ZXY":this._x=I*N*L-F*P*C,this._y=F*P*L+I*N*C,this._z=F*N*C+I*P*L,this._w=F*N*L-I*P*C;break;case"ZYX":this._x=I*N*L-F*P*C,this._y=F*P*L+I*N*C,this._z=F*N*C-I*P*L,this._w=F*N*L+I*P*C;break;case"YZX":this._x=I*N*L+F*P*C,this._y=F*P*L+I*N*C,this._z=F*N*C-I*P*L,this._w=F*N*L-I*P*C;break;case"XZY":this._x=I*N*L-F*P*C,this._y=F*P*L-I*N*C,this._z=F*N*C+I*P*L,this._w=F*N*L+I*P*C;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+V)}if(J===!0)this._onChangeCallback();return this}setFromAxisAngle($,J){let Q=J/2,Z=Math.sin(Q);return this._x=$.x*Z,this._y=$.y*Z,this._z=$.z*Z,this._w=Math.cos(Q),this._onChangeCallback(),this}setFromRotationMatrix($){let J=$.elements,Q=J[0],Z=J[4],Y=J[8],V=J[1],q=J[5],U=J[9],F=J[2],N=J[6],L=J[10],I=Q+q+L;if(I>0){let P=0.5/Math.sqrt(I+1);this._w=0.25/P,this._x=(N-U)*P,this._y=(Y-F)*P,this._z=(V-Z)*P}else if(Q>q&&Q>L){let P=2*Math.sqrt(1+Q-q-L);this._w=(N-U)/P,this._x=0.25*P,this._y=(Z+V)/P,this._z=(Y+F)/P}else if(q>L){let P=2*Math.sqrt(1+q-Q-L);this._w=(Y-F)/P,this._x=(Z+V)/P,this._y=0.25*P,this._z=(U+N)/P}else{let P=2*Math.sqrt(1+L-Q-q);this._w=(V-Z)/P,this._x=(Y+F)/P,this._y=(U+N)/P,this._z=0.25*P}return this._onChangeCallback(),this}setFromUnitVectors($,J){let Q=$.dot(J)+1;if(Q<0.00000001)if(Q=0,Math.abs($.x)>Math.abs($.z))this._x=-$.y,this._y=$.x,this._z=0,this._w=Q;else this._x=0,this._y=-$.z,this._z=$.y,this._w=Q;else this._x=$.y*J.z-$.z*J.y,this._y=$.z*J.x-$.x*J.z,this._z=$.x*J.y-$.y*J.x,this._w=Q;return this.normalize()}angleTo($){return 2*Math.acos(Math.abs(w$(this.dot($),-1,1)))}rotateTowards($,J){let Q=this.angleTo($);if(Q===0)return this;let Z=Math.min(1,J/Q);return this.slerp($,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot($){return this._x*$._x+this._y*$._y+this._z*$._z+this._w*$._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let $=this.length();if($===0)this._x=0,this._y=0,this._z=0,this._w=1;else $=1/$,this._x=this._x*$,this._y=this._y*$,this._z=this._z*$,this._w=this._w*$;return this._onChangeCallback(),this}multiply($){return this.multiplyQuaternions(this,$)}premultiply($){return this.multiplyQuaternions($,this)}multiplyQuaternions($,J){let{_x:Q,_y:Z,_z:Y,_w:V}=$,q=J._x,U=J._y,F=J._z,N=J._w;return this._x=Q*N+V*q+Z*F-Y*U,this._y=Z*N+V*U+Y*q-Q*F,this._z=Y*N+V*F+Q*U-Z*q,this._w=V*N-Q*q-Z*U-Y*F,this._onChangeCallback(),this}slerp($,J){if(J===0)return this;if(J===1)return this.copy($);let Q=this._x,Z=this._y,Y=this._z,V=this._w,q=V*$._w+Q*$._x+Z*$._y+Y*$._z;if(q<0)this._w=-$._w,this._x=-$._x,this._y=-$._y,this._z=-$._z,q=-q;else this.copy($);if(q>=1)return this._w=V,this._x=Q,this._y=Z,this._z=Y,this;let U=1-q*q;if(U<=Number.EPSILON){let P=1-J;return this._w=P*V+J*this._w,this._x=P*Q+J*this._x,this._y=P*Z+J*this._y,this._z=P*Y+J*this._z,this.normalize(),this}let F=Math.sqrt(U),N=Math.atan2(F,q),L=Math.sin((1-J)*N)/F,I=Math.sin(J*N)/F;return this._w=V*L+this._w*I,this._x=Q*L+this._x*I,this._y=Z*L+this._y*I,this._z=Y*L+this._z*I,this._onChangeCallback(),this}slerpQuaternions($,J,Q){return this.copy($).slerp(J,Q)}random(){let $=2*Math.PI*Math.random(),J=2*Math.PI*Math.random(),Q=Math.random(),Z=Math.sqrt(1-Q),Y=Math.sqrt(Q);return this.set(Z*Math.sin($),Z*Math.cos($),Y*Math.sin(J),Y*Math.cos(J))}equals($){return $._x===this._x&&$._y===this._y&&$._z===this._z&&$._w===this._w}fromArray($,J=0){return this._x=$[J],this._y=$[J+1],this._z=$[J+2],this._w=$[J+3],this._onChangeCallback(),this}toArray($=[],J=0){return $[J]=this._x,$[J+1]=this._y,$[J+2]=this._z,$[J+3]=this._w,$}fromBufferAttribute($,J){return this._x=$.getX(J),this._y=$.getY(J),this._z=$.getZ(J),this._w=$.getW(J),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange($){return this._onChangeCallback=$,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}};s=class s{constructor($=0,J=0,Q=0){s.prototype.isVector3=!0,this.x=$,this.y=J,this.z=Q}set($,J,Q){if(Q===void 0)Q=this.z;return this.x=$,this.y=J,this.z=Q,this}setScalar($){return this.x=$,this.y=$,this.z=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setZ($){return this.z=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;case 2:this.z=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy($){return this.x=$.x,this.y=$.y,this.z=$.z,this}add($){return this.x+=$.x,this.y+=$.y,this.z+=$.z,this}addScalar($){return this.x+=$,this.y+=$,this.z+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this.z=$.z+J.z,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this.z+=$.z*J,this}sub($){return this.x-=$.x,this.y-=$.y,this.z-=$.z,this}subScalar($){return this.x-=$,this.y-=$,this.z-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this.z=$.z-J.z,this}multiply($){return this.x*=$.x,this.y*=$.y,this.z*=$.z,this}multiplyScalar($){return this.x*=$,this.y*=$,this.z*=$,this}multiplyVectors($,J){return this.x=$.x*J.x,this.y=$.y*J.y,this.z=$.z*J.z,this}applyEuler($){return this.applyQuaternion(iY.setFromEuler($))}applyAxisAngle($,J){return this.applyQuaternion(iY.setFromAxisAngle($,J))}applyMatrix3($){let J=this.x,Q=this.y,Z=this.z,Y=$.elements;return this.x=Y[0]*J+Y[3]*Q+Y[6]*Z,this.y=Y[1]*J+Y[4]*Q+Y[7]*Z,this.z=Y[2]*J+Y[5]*Q+Y[8]*Z,this}applyNormalMatrix($){return this.applyMatrix3($).normalize()}applyMatrix4($){let J=this.x,Q=this.y,Z=this.z,Y=$.elements,V=1/(Y[3]*J+Y[7]*Q+Y[11]*Z+Y[15]);return this.x=(Y[0]*J+Y[4]*Q+Y[8]*Z+Y[12])*V,this.y=(Y[1]*J+Y[5]*Q+Y[9]*Z+Y[13])*V,this.z=(Y[2]*J+Y[6]*Q+Y[10]*Z+Y[14])*V,this}applyQuaternion($){let J=this.x,Q=this.y,Z=this.z,Y=$.x,V=$.y,q=$.z,U=$.w,F=2*(V*Z-q*Q),N=2*(q*J-Y*Z),L=2*(Y*Q-V*J);return this.x=J+U*F+V*L-q*N,this.y=Q+U*N+q*F-Y*L,this.z=Z+U*L+Y*N-V*F,this}project($){return this.applyMatrix4($.matrixWorldInverse).applyMatrix4($.projectionMatrix)}unproject($){return this.applyMatrix4($.projectionMatrixInverse).applyMatrix4($.matrixWorld)}transformDirection($){let J=this.x,Q=this.y,Z=this.z,Y=$.elements;return this.x=Y[0]*J+Y[4]*Q+Y[8]*Z,this.y=Y[1]*J+Y[5]*Q+Y[9]*Z,this.z=Y[2]*J+Y[6]*Q+Y[10]*Z,this.normalize()}divide($){return this.x/=$.x,this.y/=$.y,this.z/=$.z,this}divideScalar($){return this.multiplyScalar(1/$)}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this.z=Math.min(this.z,$.z),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this.z=Math.max(this.z,$.z),this}clamp($,J){return this.x=w$(this.x,$.x,J.x),this.y=w$(this.y,$.y,J.y),this.z=w$(this.z,$.z,J.z),this}clampScalar($,J){return this.x=w$(this.x,$,J),this.y=w$(this.y,$,J),this.z=w$(this.z,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(w$(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot($){return this.x*$.x+this.y*$.y+this.z*$.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this.z+=($.z-this.z)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this.z=$.z+(J.z-$.z)*Q,this}cross($){return this.crossVectors(this,$)}crossVectors($,J){let{x:Q,y:Z,z:Y}=$,V=J.x,q=J.y,U=J.z;return this.x=Z*U-Y*q,this.y=Y*V-Q*U,this.z=Q*q-Z*V,this}projectOnVector($){let J=$.lengthSq();if(J===0)return this.set(0,0,0);let Q=$.dot(this)/J;return this.copy($).multiplyScalar(Q)}projectOnPlane($){return m4.copy(this).projectOnVector($),this.sub(m4)}reflect($){return this.sub(m4.copy($).multiplyScalar(2*this.dot($)))}angleTo($){let J=Math.sqrt(this.lengthSq()*$.lengthSq());if(J===0)return Math.PI/2;let Q=this.dot($)/J;return Math.acos(w$(Q,-1,1))}distanceTo($){return Math.sqrt(this.distanceToSquared($))}distanceToSquared($){let J=this.x-$.x,Q=this.y-$.y,Z=this.z-$.z;return J*J+Q*Q+Z*Z}manhattanDistanceTo($){return Math.abs(this.x-$.x)+Math.abs(this.y-$.y)+Math.abs(this.z-$.z)}setFromSpherical($){return this.setFromSphericalCoords($.radius,$.phi,$.theta)}setFromSphericalCoords($,J,Q){let Z=Math.sin(J)*$;return this.x=Z*Math.sin(Q),this.y=Math.cos(J)*$,this.z=Z*Math.cos(Q),this}setFromCylindrical($){return this.setFromCylindricalCoords($.radius,$.theta,$.y)}setFromCylindricalCoords($,J,Q){return this.x=$*Math.sin(J),this.y=Q,this.z=$*Math.cos(J),this}setFromMatrixPosition($){let J=$.elements;return this.x=J[12],this.y=J[13],this.z=J[14],this}setFromMatrixScale($){let J=this.setFromMatrixColumn($,0).length(),Q=this.setFromMatrixColumn($,1).length(),Z=this.setFromMatrixColumn($,2).length();return this.x=J,this.y=Q,this.z=Z,this}setFromMatrixColumn($,J){return this.fromArray($.elements,J*4)}setFromMatrix3Column($,J){return this.fromArray($.elements,J*3)}setFromEuler($){return this.x=$._x,this.y=$._y,this.z=$._z,this}setFromColor($){return this.x=$.r,this.y=$.g,this.z=$.b,this}equals($){return $.x===this.x&&$.y===this.y&&$.z===this.z}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this.z=$[J+2],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$[J+2]=this.z,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this.z=$.getZ(J),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let $=Math.random()*Math.PI*2,J=Math.random()*2-1,Q=Math.sqrt(1-J*J);return this.x=Q*Math.cos($),this.y=J,this.z=Q*Math.sin($),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};m4=new s,iY=new N5;c4=new A$;aY={};rY=new A$().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),tY=new A$().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);o$=n2();n4=new s;b9=class b9 extends d5{constructor($=b9.DEFAULT_IMAGE,J=b9.DEFAULT_MAPPING,Q=1001,Z=1001,Y=1006,V=1008,q=1023,U=1009,F=b9.DEFAULT_ANISOTROPY,N=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:i2++}),this.uuid=t7(),this.name="",this.source=new RZ($),this.mipmaps=[],this.mapping=J,this.channel=0,this.wrapS=Q,this.wrapT=Z,this.magFilter=Y,this.minFilter=V,this.anisotropy=F,this.format=q,this.internalFormat=null,this.type=U,this.offset=new O$(0,0),this.repeat=new O$(1,1),this.center=new O$(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new A$,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=N,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=$&&$.depth&&$.depth>1?!0:!1,this.pmremVersion=0}get width(){return this.source.getSize(n4).x}get height(){return this.source.getSize(n4).y}get depth(){return this.source.getSize(n4).z}get image(){return this.source.data}set image($=null){this.source.data=$}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy($){return this.name=$.name,this.source=$.source,this.mipmaps=$.mipmaps.slice(0),this.mapping=$.mapping,this.channel=$.channel,this.wrapS=$.wrapS,this.wrapT=$.wrapT,this.magFilter=$.magFilter,this.minFilter=$.minFilter,this.anisotropy=$.anisotropy,this.format=$.format,this.internalFormat=$.internalFormat,this.type=$.type,this.offset.copy($.offset),this.repeat.copy($.repeat),this.center.copy($.center),this.rotation=$.rotation,this.matrixAutoUpdate=$.matrixAutoUpdate,this.matrix.copy($.matrix),this.generateMipmaps=$.generateMipmaps,this.premultiplyAlpha=$.premultiplyAlpha,this.flipY=$.flipY,this.unpackAlignment=$.unpackAlignment,this.colorSpace=$.colorSpace,this.renderTarget=$.renderTarget,this.isRenderTargetTexture=$.isRenderTargetTexture,this.isArrayTexture=$.isArrayTexture,this.userData=JSON.parse(JSON.stringify($.userData)),this.needsUpdate=!0,this}setValues($){for(let J in $){let Q=$[J];if(Q===void 0){console.warn(`THREE.Texture.setValues(): parameter '${J}' has value of undefined.`);continue}let Z=this[J];if(Z===void 0){console.warn(`THREE.Texture.setValues(): property '${J}' does not exist.`);continue}if(Z&&Q&&(Z.isVector2&&Q.isVector2))Z.copy(Q);else if(Z&&Q&&(Z.isVector3&&Q.isVector3))Z.copy(Q);else if(Z&&Q&&(Z.isMatrix3&&Q.isMatrix3))Z.copy(Q);else this[J]=Q}}toJSON($){let J=$===void 0||typeof $==="string";if(!J&&$.textures[this.uuid]!==void 0)return $.textures[this.uuid];let Q={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON($).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)Q.userData=this.userData;if(!J)$.textures[this.uuid]=Q;return Q}dispose(){this.dispatchEvent({type:"dispose"})}transformUv($){if(this.mapping!==300)return $;if($.applyMatrix3(this.matrix),$.x<0||$.x>1)switch(this.wrapS){case 1000:$.x=$.x-Math.floor($.x);break;case 1001:$.x=$.x<0?0:1;break;case 1002:if(Math.abs(Math.floor($.x)%2)===1)$.x=Math.ceil($.x)-$.x;else $.x=$.x-Math.floor($.x);break}if($.y<0||$.y>1)switch(this.wrapT){case 1000:$.y=$.y-Math.floor($.y);break;case 1001:$.y=$.y<0?0:1;break;case 1002:if(Math.abs(Math.floor($.y)%2)===1)$.y=Math.ceil($.y)-$.y;else $.y=$.y-Math.floor($.y);break}if(this.flipY)$.y=1-$.y;return $}set needsUpdate($){if($===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate($){if($===!0)this.pmremVersion++}};b9.DEFAULT_IMAGE=null;b9.DEFAULT_MAPPING=300;b9.DEFAULT_ANISOTROPY=1;a$=class a${constructor($=0,J=0,Q=0,Z=1){a$.prototype.isVector4=!0,this.x=$,this.y=J,this.z=Q,this.w=Z}get width(){return this.z}set width($){this.z=$}get height(){return this.w}set height($){this.w=$}set($,J,Q,Z){return this.x=$,this.y=J,this.z=Q,this.w=Z,this}setScalar($){return this.x=$,this.y=$,this.z=$,this.w=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setZ($){return this.z=$,this}setW($){return this.w=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;case 2:this.z=J;break;case 3:this.w=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy($){return this.x=$.x,this.y=$.y,this.z=$.z,this.w=$.w!==void 0?$.w:1,this}add($){return this.x+=$.x,this.y+=$.y,this.z+=$.z,this.w+=$.w,this}addScalar($){return this.x+=$,this.y+=$,this.z+=$,this.w+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this.z=$.z+J.z,this.w=$.w+J.w,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this.z+=$.z*J,this.w+=$.w*J,this}sub($){return this.x-=$.x,this.y-=$.y,this.z-=$.z,this.w-=$.w,this}subScalar($){return this.x-=$,this.y-=$,this.z-=$,this.w-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this.z=$.z-J.z,this.w=$.w-J.w,this}multiply($){return this.x*=$.x,this.y*=$.y,this.z*=$.z,this.w*=$.w,this}multiplyScalar($){return this.x*=$,this.y*=$,this.z*=$,this.w*=$,this}applyMatrix4($){let J=this.x,Q=this.y,Z=this.z,Y=this.w,V=$.elements;return this.x=V[0]*J+V[4]*Q+V[8]*Z+V[12]*Y,this.y=V[1]*J+V[5]*Q+V[9]*Z+V[13]*Y,this.z=V[2]*J+V[6]*Q+V[10]*Z+V[14]*Y,this.w=V[3]*J+V[7]*Q+V[11]*Z+V[15]*Y,this}divide($){return this.x/=$.x,this.y/=$.y,this.z/=$.z,this.w/=$.w,this}divideScalar($){return this.multiplyScalar(1/$)}setAxisAngleFromQuaternion($){this.w=2*Math.acos($.w);let J=Math.sqrt(1-$.w*$.w);if(J<0.0001)this.x=1,this.y=0,this.z=0;else this.x=$.x/J,this.y=$.y/J,this.z=$.z/J;return this}setAxisAngleFromRotationMatrix($){let J,Q,Z,Y,V=0.01,q=0.1,U=$.elements,F=U[0],N=U[4],L=U[8],I=U[1],P=U[5],C=U[9],M=U[2],A=U[6],R=U[10];if(Math.abs(N-I)<0.01&&Math.abs(L-M)<0.01&&Math.abs(C-A)<0.01){if(Math.abs(N+I)<0.1&&Math.abs(L+M)<0.1&&Math.abs(C+A)<0.1&&Math.abs(F+P+R-3)<0.1)return this.set(1,0,0,0),this;J=Math.PI;let y=(F+1)/2,G=(P+1)/2,f=(R+1)/2,d=(N+I)/4,g=(L+M)/4,b=(C+A)/4;if(y>G&&y>f)if(y<0.01)Q=0,Z=0.707106781,Y=0.707106781;else Q=Math.sqrt(y),Z=d/Q,Y=g/Q;else if(G>f)if(G<0.01)Q=0.707106781,Z=0,Y=0.707106781;else Z=Math.sqrt(G),Q=d/Z,Y=b/Z;else if(f<0.01)Q=0.707106781,Z=0.707106781,Y=0;else Y=Math.sqrt(f),Q=g/Y,Z=b/Y;return this.set(Q,Z,Y,J),this}let E=Math.sqrt((A-C)*(A-C)+(L-M)*(L-M)+(I-N)*(I-N));if(Math.abs(E)<0.001)E=1;return this.x=(A-C)/E,this.y=(L-M)/E,this.z=(I-N)/E,this.w=Math.acos((F+P+R-1)/2),this}setFromMatrixPosition($){let J=$.elements;return this.x=J[12],this.y=J[13],this.z=J[14],this.w=J[15],this}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this.z=Math.min(this.z,$.z),this.w=Math.min(this.w,$.w),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this.z=Math.max(this.z,$.z),this.w=Math.max(this.w,$.w),this}clamp($,J){return this.x=w$(this.x,$.x,J.x),this.y=w$(this.y,$.y,J.y),this.z=w$(this.z,$.z,J.z),this.w=w$(this.w,$.w,J.w),this}clampScalar($,J){return this.x=w$(this.x,$,J),this.y=w$(this.y,$,J),this.z=w$(this.z,$,J),this.w=w$(this.w,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(w$(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot($){return this.x*$.x+this.y*$.y+this.z*$.z+this.w*$.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this.z+=($.z-this.z)*J,this.w+=($.w-this.w)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this.z=$.z+(J.z-$.z)*Q,this.w=$.w+(J.w-$.w)*Q,this}equals($){return $.x===this.x&&$.y===this.y&&$.z===this.z&&$.w===this.w}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this.z=$[J+2],this.w=$[J+3],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$[J+2]=this.z,$[J+3]=this.w,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this.z=$.getZ(J),this.w=$.getW(J),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};XK=class XK extends d5{constructor($=1,J=1,Q={}){super();Q=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},Q),this.isRenderTarget=!0,this.width=$,this.height=J,this.depth=Q.depth,this.scissor=new a$(0,0,$,J),this.scissorTest=!1,this.viewport=new a$(0,0,$,J);let Z={width:$,height:J,depth:Q.depth},Y=new b9(Z);this.textures=[];let V=Q.count;for(let q=0;q<V;q++)this.textures[q]=Y.clone(),this.textures[q].isRenderTargetTexture=!0,this.textures[q].renderTarget=this;this._setTextureOptions(Q),this.depthBuffer=Q.depthBuffer,this.stencilBuffer=Q.stencilBuffer,this.resolveDepthBuffer=Q.resolveDepthBuffer,this.resolveStencilBuffer=Q.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=Q.depthTexture,this.samples=Q.samples,this.multiview=Q.multiview}_setTextureOptions($={}){let J={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if($.mapping!==void 0)J.mapping=$.mapping;if($.wrapS!==void 0)J.wrapS=$.wrapS;if($.wrapT!==void 0)J.wrapT=$.wrapT;if($.wrapR!==void 0)J.wrapR=$.wrapR;if($.magFilter!==void 0)J.magFilter=$.magFilter;if($.minFilter!==void 0)J.minFilter=$.minFilter;if($.format!==void 0)J.format=$.format;if($.type!==void 0)J.type=$.type;if($.anisotropy!==void 0)J.anisotropy=$.anisotropy;if($.colorSpace!==void 0)J.colorSpace=$.colorSpace;if($.flipY!==void 0)J.flipY=$.flipY;if($.generateMipmaps!==void 0)J.generateMipmaps=$.generateMipmaps;if($.internalFormat!==void 0)J.internalFormat=$.internalFormat;for(let Q=0;Q<this.textures.length;Q++)this.textures[Q].setValues(J)}get texture(){return this.textures[0]}set texture($){this.textures[0]=$}set depthTexture($){if(this._depthTexture!==null)this._depthTexture.renderTarget=null;if($!==null)$.renderTarget=this;this._depthTexture=$}get depthTexture(){return this._depthTexture}setSize($,J,Q=1){if(this.width!==$||this.height!==J||this.depth!==Q){this.width=$,this.height=J,this.depth=Q;for(let Z=0,Y=this.textures.length;Z<Y;Z++)this.textures[Z].image.width=$,this.textures[Z].image.height=J,this.textures[Z].image.depth=Q,this.textures[Z].isArrayTexture=this.textures[Z].image.depth>1;this.dispose()}this.viewport.set(0,0,$,J),this.scissor.set(0,0,$,J)}clone(){return new this.constructor().copy(this)}copy($){this.width=$.width,this.height=$.height,this.depth=$.depth,this.scissor.copy($.scissor),this.scissorTest=$.scissorTest,this.viewport.copy($.viewport),this.textures.length=0;for(let J=0,Q=$.textures.length;J<Q;J++){this.textures[J]=$.textures[J].clone(),this.textures[J].isRenderTargetTexture=!0,this.textures[J].renderTarget=this;let Z=Object.assign({},$.textures[J].image);this.textures[J].source=new RZ(Z)}if(this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,$.depthTexture!==null)this.depthTexture=$.depthTexture.clone();return this.samples=$.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}};p8=class p8 extends XK{constructor($=1,J=1,Q={}){super($,J,Q);this.isWebGLRenderTarget=!0}};TX=class TX extends b9{constructor($=null,J=1,Q=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:$,width:J,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate($){this.layerUpdates.add($)}clearLayerUpdates(){this.layerUpdates.clear()}};WK=class WK extends b9{constructor($=null,J=1,Q=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:$,width:J,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};w8=[new s,new s,new s,new s,new s,new s,new s,new s],s7=new s,lQ=new O8,F6=new s,B6=new s,N6=new s,V5=new s,K5=new s,f5=new s,AJ=new s,dQ=new s,mQ=new s,b5=new s;a2=new O8,TJ=new s,i4=new s;_8=new s,a4=new s,cQ=new s,U5=new s,r4=new s,oQ=new s,t4=new s;O6=new s,i7=new _$,r2=new s(0,0,0),t2=new s(1,1,1),q5=new s,nQ=new s,N7=new s,eY=new _$,$V=new N5;e7=class e7{constructor($=0,J=0,Q=0,Z=e7.DEFAULT_ORDER){this.isEuler=!0,this._x=$,this._y=J,this._z=Q,this._order=Z}get x(){return this._x}set x($){this._x=$,this._onChangeCallback()}get y(){return this._y}set y($){this._y=$,this._onChangeCallback()}get z(){return this._z}set z($){this._z=$,this._onChangeCallback()}get order(){return this._order}set order($){this._order=$,this._onChangeCallback()}set($,J,Q,Z=this._order){return this._x=$,this._y=J,this._z=Q,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy($){return this._x=$._x,this._y=$._y,this._z=$._z,this._order=$._order,this._onChangeCallback(),this}setFromRotationMatrix($,J=this._order,Q=!0){let Z=$.elements,Y=Z[0],V=Z[4],q=Z[8],U=Z[1],F=Z[5],N=Z[9],L=Z[2],I=Z[6],P=Z[10];switch(J){case"XYZ":if(this._y=Math.asin(w$(q,-1,1)),Math.abs(q)<0.9999999)this._x=Math.atan2(-N,P),this._z=Math.atan2(-V,Y);else this._x=Math.atan2(I,F),this._z=0;break;case"YXZ":if(this._x=Math.asin(-w$(N,-1,1)),Math.abs(N)<0.9999999)this._y=Math.atan2(q,P),this._z=Math.atan2(U,F);else this._y=Math.atan2(-L,Y),this._z=0;break;case"ZXY":if(this._x=Math.asin(w$(I,-1,1)),Math.abs(I)<0.9999999)this._y=Math.atan2(-L,P),this._z=Math.atan2(-V,F);else this._y=0,this._z=Math.atan2(U,Y);break;case"ZYX":if(this._y=Math.asin(-w$(L,-1,1)),Math.abs(L)<0.9999999)this._x=Math.atan2(I,P),this._z=Math.atan2(U,Y);else this._x=0,this._z=Math.atan2(-V,F);break;case"YZX":if(this._z=Math.asin(w$(U,-1,1)),Math.abs(U)<0.9999999)this._x=Math.atan2(-N,F),this._y=Math.atan2(-L,Y);else this._x=0,this._y=Math.atan2(q,P);break;case"XZY":if(this._z=Math.asin(-w$(V,-1,1)),Math.abs(V)<0.9999999)this._x=Math.atan2(I,F),this._y=Math.atan2(q,Y);else this._x=Math.atan2(-N,P),this._y=0;break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+J)}if(this._order=J,Q===!0)this._onChangeCallback();return this}setFromQuaternion($,J,Q){return eY.makeRotationFromQuaternion($),this.setFromRotationMatrix(eY,J,Q)}setFromVector3($,J=this._order){return this.set($.x,$.y,$.z,J)}reorder($){return $V.setFromEuler(this),this.setFromQuaternion($V,$)}equals($){return $._x===this._x&&$._y===this._y&&$._z===this._z&&$._order===this._order}fromArray($){if(this._x=$[0],this._y=$[1],this._z=$[2],$[3]!==void 0)this._order=$[3];return this._onChangeCallback(),this}toArray($=[],J=0){return $[J]=this._x,$[J+1]=this._y,$[J+2]=this._z,$[J+3]=this._order,$}_onChange($){return this._onChangeCallback=$,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};e7.DEFAULT_ORDER="XYZ";JV=new s,L6=new N5,y8=new _$,sQ=new s,SJ=new s,$F=new s,JF=new N5,QV=new s(1,0,0),ZV=new s(0,1,0),XV=new s(0,0,1),WV={type:"added"},QF={type:"removed"},I6={type:"childadded",child:null},e4={type:"childremoved",child:null};N9=class N9 extends d5{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:e2++}),this.uuid=t7(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=N9.DEFAULT_UP.clone();let $=new s,J=new e7,Q=new N5,Z=new s(1,1,1);function Y(){Q.setFromEuler(J,!1)}function V(){J.setFromQuaternion(Q,void 0,!1)}J._onChange(Y),Q._onChange(V),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:$},rotation:{configurable:!0,enumerable:!0,value:J},quaternion:{configurable:!0,enumerable:!0,value:Q},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new _$},normalMatrix:{value:new A$}}),this.matrix=new _$,this.matrixWorld=new _$,this.matrixAutoUpdate=N9.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=N9.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new SX,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4($){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply($),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion($){return this.quaternion.premultiply($),this}setRotationFromAxisAngle($,J){this.quaternion.setFromAxisAngle($,J)}setRotationFromEuler($){this.quaternion.setFromEuler($,!0)}setRotationFromMatrix($){this.quaternion.setFromRotationMatrix($)}setRotationFromQuaternion($){this.quaternion.copy($)}rotateOnAxis($,J){return L6.setFromAxisAngle($,J),this.quaternion.multiply(L6),this}rotateOnWorldAxis($,J){return L6.setFromAxisAngle($,J),this.quaternion.premultiply(L6),this}rotateX($){return this.rotateOnAxis(QV,$)}rotateY($){return this.rotateOnAxis(ZV,$)}rotateZ($){return this.rotateOnAxis(XV,$)}translateOnAxis($,J){return JV.copy($).applyQuaternion(this.quaternion),this.position.add(JV.multiplyScalar(J)),this}translateX($){return this.translateOnAxis(QV,$)}translateY($){return this.translateOnAxis(ZV,$)}translateZ($){return this.translateOnAxis(XV,$)}localToWorld($){return this.updateWorldMatrix(!0,!1),$.applyMatrix4(this.matrixWorld)}worldToLocal($){return this.updateWorldMatrix(!0,!1),$.applyMatrix4(y8.copy(this.matrixWorld).invert())}lookAt($,J,Q){if($.isVector3)sQ.copy($);else sQ.set($,J,Q);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),SJ.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)y8.lookAt(SJ,sQ,this.up);else y8.lookAt(sQ,SJ,this.up);if(this.quaternion.setFromRotationMatrix(y8),Z)y8.extractRotation(Z.matrixWorld),L6.setFromRotationMatrix(y8),this.quaternion.premultiply(L6.invert())}add($){if(arguments.length>1){for(let J=0;J<arguments.length;J++)this.add(arguments[J]);return this}if($===this)return console.error("THREE.Object3D.add: object can't be added as a child of itself.",$),this;if($&&$.isObject3D)$.removeFromParent(),$.parent=this,this.children.push($),$.dispatchEvent(WV),I6.child=$,this.dispatchEvent(I6),I6.child=null;else console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",$);return this}remove($){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.remove(arguments[Q]);return this}let J=this.children.indexOf($);if(J!==-1)$.parent=null,this.children.splice(J,1),$.dispatchEvent(QF),e4.child=$,this.dispatchEvent(e4),e4.child=null;return this}removeFromParent(){let $=this.parent;if($!==null)$.remove(this);return this}clear(){return this.remove(...this.children)}attach($){if(this.updateWorldMatrix(!0,!1),y8.copy(this.matrixWorld).invert(),$.parent!==null)$.parent.updateWorldMatrix(!0,!1),y8.multiply($.parent.matrixWorld);return $.applyMatrix4(y8),$.removeFromParent(),$.parent=this,this.children.push($),$.updateWorldMatrix(!1,!0),$.dispatchEvent(WV),I6.child=$,this.dispatchEvent(I6),I6.child=null,this}getObjectById($){return this.getObjectByProperty("id",$)}getObjectByName($){return this.getObjectByProperty("name",$)}getObjectByProperty($,J){if(this[$]===J)return this;for(let Q=0,Z=this.children.length;Q<Z;Q++){let V=this.children[Q].getObjectByProperty($,J);if(V!==void 0)return V}return}getObjectsByProperty($,J,Q=[]){if(this[$]===J)Q.push(this);let Z=this.children;for(let Y=0,V=Z.length;Y<V;Y++)Z[Y].getObjectsByProperty($,J,Q);return Q}getWorldPosition($){return this.updateWorldMatrix(!0,!1),$.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion($){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(SJ,$,$F),$}getWorldScale($){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(SJ,JF,$),$}getWorldDirection($){this.updateWorldMatrix(!0,!1);let J=this.matrixWorld.elements;return $.set(J[8],J[9],J[10]).normalize()}raycast(){}traverse($){$(this);let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].traverse($)}traverseVisible($){if(this.visible===!1)return;$(this);let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].traverseVisible($)}traverseAncestors($){let J=this.parent;if(J!==null)$(J),J.traverseAncestors($)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld($){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].updateMatrixWorld($)}updateWorldMatrix($,J){let Q=this.parent;if($===!0&&Q!==null)Q.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if(J===!0){let Z=this.children;for(let Y=0,V=Z.length;Y<V;Y++)Z[Y].updateWorldMatrix(!1,!0)}}toJSON($){let J=$===void 0||typeof $==="string",Q={};if(J)$={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},Q.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.geometryInfo=this._geometryInfo.map((q)=>({...q,boundingBox:q.boundingBox?q.boundingBox.toJSON():void 0,boundingSphere:q.boundingSphere?q.boundingSphere.toJSON():void 0})),Z.instanceInfo=this._instanceInfo.map((q)=>({...q})),Z.availableInstanceIds=this._availableInstanceIds.slice(),Z.availableGeometryIds=this._availableGeometryIds.slice(),Z.nextIndexStart=this._nextIndexStart,Z.nextVertexStart=this._nextVertexStart,Z.geometryCount=this._geometryCount,Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.matricesTexture=this._matricesTexture.toJSON($),Z.indirectTexture=this._indirectTexture.toJSON($),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON($);if(this.boundingSphere!==null)Z.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)Z.boundingBox=this.boundingBox.toJSON()}function Y(q,U){if(q[U.uuid]===void 0)q[U.uuid]=U.toJSON($);return U.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON($).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON($).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=Y($.geometries,this.geometry);let q=this.geometry.parameters;if(q!==void 0&&q.shapes!==void 0){let U=q.shapes;if(Array.isArray(U))for(let F=0,N=U.length;F<N;F++){let L=U[F];Y($.shapes,L)}else Y($.shapes,U)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)Y($.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let q=[];for(let U=0,F=this.material.length;U<F;U++)q.push(Y($.materials,this.material[U]));Z.material=q}else Z.material=Y($.materials,this.material);if(this.children.length>0){Z.children=[];for(let q=0;q<this.children.length;q++)Z.children.push(this.children[q].toJSON($).object)}if(this.animations.length>0){Z.animations=[];for(let q=0;q<this.animations.length;q++){let U=this.animations[q];Z.animations.push(Y($.animations,U))}}if(J){let q=V($.geometries),U=V($.materials),F=V($.textures),N=V($.images),L=V($.shapes),I=V($.skeletons),P=V($.animations),C=V($.nodes);if(q.length>0)Q.geometries=q;if(U.length>0)Q.materials=U;if(F.length>0)Q.textures=F;if(N.length>0)Q.images=N;if(L.length>0)Q.shapes=L;if(I.length>0)Q.skeletons=I;if(P.length>0)Q.animations=P;if(C.length>0)Q.nodes=C}return Q.object=Z,Q;function V(q){let U=[];for(let F in q){let N=q[F];delete N.metadata,U.push(N)}return U}}clone($){return new this.constructor().copy(this,$)}copy($,J=!0){if(this.name=$.name,this.up.copy($.up),this.position.copy($.position),this.rotation.order=$.rotation.order,this.quaternion.copy($.quaternion),this.scale.copy($.scale),this.matrix.copy($.matrix),this.matrixWorld.copy($.matrixWorld),this.matrixAutoUpdate=$.matrixAutoUpdate,this.matrixWorldAutoUpdate=$.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=$.matrixWorldNeedsUpdate,this.layers.mask=$.layers.mask,this.visible=$.visible,this.castShadow=$.castShadow,this.receiveShadow=$.receiveShadow,this.frustumCulled=$.frustumCulled,this.renderOrder=$.renderOrder,this.animations=$.animations.slice(),this.userData=JSON.parse(JSON.stringify($.userData)),J===!0)for(let Q=0;Q<$.children.length;Q++){let Z=$.children[Q];this.add(Z.clone())}return this}};N9.DEFAULT_UP=new s(0,1,0);N9.DEFAULT_MATRIX_AUTO_UPDATE=!0;N9.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;a7=new s,f8=new s,$X=new s,b8=new s,D6=new s,P6=new s,YV=new s,JX=new s,QX=new s,ZX=new s,XX=new a$,WX=new a$,YX=new a$;YK={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},H5={h:0,s:0,l:0},iQ={h:0,s:0,l:0};G$=class G${constructor($,J,Q){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set($,J,Q)}set($,J,Q){if(J===void 0&&Q===void 0){let Z=$;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB($,J,Q);return this}setScalar($){return this.r=$,this.g=$,this.b=$,this}setHex($,J="srgb"){return $=Math.floor($),this.r=($>>16&255)/255,this.g=($>>8&255)/255,this.b=($&255)/255,o$.colorSpaceToWorking(this,J),this}setRGB($,J,Q,Z=o$.workingColorSpace){return this.r=$,this.g=J,this.b=Q,o$.colorSpaceToWorking(this,Z),this}setHSL($,J,Q,Z=o$.workingColorSpace){if($=AX($,1),J=w$(J,0,1),Q=w$(Q,0,1),J===0)this.r=this.g=this.b=Q;else{let Y=Q<=0.5?Q*(1+J):Q+J-Q*J,V=2*Q-Y;this.r=VX(V,Y,$+0.3333333333333333),this.g=VX(V,Y,$),this.b=VX(V,Y,$-0.3333333333333333)}return o$.colorSpaceToWorking(this,Z),this}setStyle($,J="srgb"){function Q(Y){if(Y===void 0)return;if(parseFloat(Y)<1)console.warn("THREE.Color: Alpha component of "+$+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec($)){let Y,V=Z[1],q=Z[2];switch(V){case"rgb":case"rgba":if(Y=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(q))return Q(Y[4]),this.setRGB(Math.min(255,parseInt(Y[1],10))/255,Math.min(255,parseInt(Y[2],10))/255,Math.min(255,parseInt(Y[3],10))/255,J);if(Y=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(q))return Q(Y[4]),this.setRGB(Math.min(100,parseInt(Y[1],10))/100,Math.min(100,parseInt(Y[2],10))/100,Math.min(100,parseInt(Y[3],10))/100,J);break;case"hsl":case"hsla":if(Y=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(q))return Q(Y[4]),this.setHSL(parseFloat(Y[1])/360,parseFloat(Y[2])/100,parseFloat(Y[3])/100,J);break;default:console.warn("THREE.Color: Unknown color model "+$)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec($)){let Y=Z[1],V=Y.length;if(V===3)return this.setRGB(parseInt(Y.charAt(0),16)/15,parseInt(Y.charAt(1),16)/15,parseInt(Y.charAt(2),16)/15,J);else if(V===6)return this.setHex(parseInt(Y,16),J);else console.warn("THREE.Color: Invalid hex color "+$)}else if($&&$.length>0)return this.setColorName($,J);return this}setColorName($,J="srgb"){let Q=YK[$.toLowerCase()];if(Q!==void 0)this.setHex(Q,J);else console.warn("THREE.Color: Unknown color "+$);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy($){return this.r=$.r,this.g=$.g,this.b=$.b,this}copySRGBToLinear($){return this.r=u8($.r),this.g=u8($.g),this.b=u8($.b),this}copyLinearToSRGB($){return this.r=w6($.r),this.g=w6($.g),this.b=w6($.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex($="srgb"){return o$.workingToColorSpace(o9.copy(this),$),Math.round(w$(o9.r*255,0,255))*65536+Math.round(w$(o9.g*255,0,255))*256+Math.round(w$(o9.b*255,0,255))}getHexString($="srgb"){return("000000"+this.getHex($).toString(16)).slice(-6)}getHSL($,J=o$.workingColorSpace){o$.workingToColorSpace(o9.copy(this),J);let{r:Q,g:Z,b:Y}=o9,V=Math.max(Q,Z,Y),q=Math.min(Q,Z,Y),U,F,N=(q+V)/2;if(q===V)U=0,F=0;else{let L=V-q;switch(F=N<=0.5?L/(V+q):L/(2-V-q),V){case Q:U=(Z-Y)/L+(Z<Y?6:0);break;case Z:U=(Y-Q)/L+2;break;case Y:U=(Q-Z)/L+4;break}U/=6}return $.h=U,$.s=F,$.l=N,$}getRGB($,J=o$.workingColorSpace){return o$.workingToColorSpace(o9.copy(this),J),$.r=o9.r,$.g=o9.g,$.b=o9.b,$}getStyle($="srgb"){o$.workingToColorSpace(o9.copy(this),$);let{r:J,g:Q,b:Z}=o9;if($!=="srgb")return`color(${$} ${J.toFixed(3)} ${Q.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round(J*255)},${Math.round(Q*255)},${Math.round(Z*255)})`}offsetHSL($,J,Q){return this.getHSL(H5),this.setHSL(H5.h+$,H5.s+J,H5.l+Q)}add($){return this.r+=$.r,this.g+=$.g,this.b+=$.b,this}addColors($,J){return this.r=$.r+J.r,this.g=$.g+J.g,this.b=$.b+J.b,this}addScalar($){return this.r+=$,this.g+=$,this.b+=$,this}sub($){return this.r=Math.max(0,this.r-$.r),this.g=Math.max(0,this.g-$.g),this.b=Math.max(0,this.b-$.b),this}multiply($){return this.r*=$.r,this.g*=$.g,this.b*=$.b,this}multiplyScalar($){return this.r*=$,this.g*=$,this.b*=$,this}lerp($,J){return this.r+=($.r-this.r)*J,this.g+=($.g-this.g)*J,this.b+=($.b-this.b)*J,this}lerpColors($,J,Q){return this.r=$.r+(J.r-$.r)*Q,this.g=$.g+(J.g-$.g)*Q,this.b=$.b+(J.b-$.b)*Q,this}lerpHSL($,J){this.getHSL(H5),$.getHSL(iQ);let Q=uJ(H5.h,iQ.h,J),Z=uJ(H5.s,iQ.s,J),Y=uJ(H5.l,iQ.l,J);return this.setHSL(Q,Z,Y),this}setFromVector3($){return this.r=$.x,this.g=$.y,this.b=$.z,this}applyMatrix3($){let J=this.r,Q=this.g,Z=this.b,Y=$.elements;return this.r=Y[0]*J+Y[3]*Q+Y[6]*Z,this.g=Y[1]*J+Y[4]*Q+Y[7]*Z,this.b=Y[2]*J+Y[5]*Q+Y[8]*Z,this}equals($){return $.r===this.r&&$.g===this.g&&$.b===this.b}fromArray($,J=0){return this.r=$[J],this.g=$[J+1],this.b=$[J+2],this}toArray($=[],J=0){return $[J]=this.r,$[J+1]=this.g,$[J+2]=this.b,$}fromBufferAttribute($,J){return this.r=$.getX(J),this.g=$.getY(J),this.b=$.getZ(J),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}};o9=new G$;G$.NAMES=YK;T7=class T7 extends d5{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:ZF++}),this.uuid=t7(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new G$(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest($){if(this._alphaTest>0!==$>0)this.version++;this._alphaTest=$}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues($){if($===void 0)return;for(let J in $){let Q=$[J];if(Q===void 0){console.warn(`THREE.Material: parameter '${J}' has value of undefined.`);continue}let Z=this[J];if(Z===void 0){console.warn(`THREE.Material: '${J}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set(Q);else if(Z&&Z.isVector3&&(Q&&Q.isVector3))Z.copy(Q);else this[J]=Q}}toJSON($){let J=$===void 0||typeof $==="string";if(J)$={textures:{},images:{}};let Q={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if(Q.uuid=this.uuid,Q.type=this.type,this.name!=="")Q.name=this.name;if(this.color&&this.color.isColor)Q.color=this.color.getHex();if(this.roughness!==void 0)Q.roughness=this.roughness;if(this.metalness!==void 0)Q.metalness=this.metalness;if(this.sheen!==void 0)Q.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)Q.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)Q.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)Q.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)Q.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)Q.specular=this.specular.getHex();if(this.specularIntensity!==void 0)Q.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)Q.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)Q.shininess=this.shininess;if(this.clearcoat!==void 0)Q.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)Q.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)Q.clearcoatMap=this.clearcoatMap.toJSON($).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)Q.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON($).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)Q.clearcoatNormalMap=this.clearcoatNormalMap.toJSON($).uuid,Q.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)Q.sheenColorMap=this.sheenColorMap.toJSON($).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)Q.sheenRoughnessMap=this.sheenRoughnessMap.toJSON($).uuid;if(this.dispersion!==void 0)Q.dispersion=this.dispersion;if(this.iridescence!==void 0)Q.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)Q.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)Q.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)Q.iridescenceMap=this.iridescenceMap.toJSON($).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)Q.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON($).uuid;if(this.anisotropy!==void 0)Q.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)Q.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)Q.anisotropyMap=this.anisotropyMap.toJSON($).uuid;if(this.map&&this.map.isTexture)Q.map=this.map.toJSON($).uuid;if(this.matcap&&this.matcap.isTexture)Q.matcap=this.matcap.toJSON($).uuid;if(this.alphaMap&&this.alphaMap.isTexture)Q.alphaMap=this.alphaMap.toJSON($).uuid;if(this.lightMap&&this.lightMap.isTexture)Q.lightMap=this.lightMap.toJSON($).uuid,Q.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)Q.aoMap=this.aoMap.toJSON($).uuid,Q.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)Q.bumpMap=this.bumpMap.toJSON($).uuid,Q.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)Q.normalMap=this.normalMap.toJSON($).uuid,Q.normalMapType=this.normalMapType,Q.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)Q.displacementMap=this.displacementMap.toJSON($).uuid,Q.displacementScale=this.displacementScale,Q.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)Q.roughnessMap=this.roughnessMap.toJSON($).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)Q.metalnessMap=this.metalnessMap.toJSON($).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)Q.emissiveMap=this.emissiveMap.toJSON($).uuid;if(this.specularMap&&this.specularMap.isTexture)Q.specularMap=this.specularMap.toJSON($).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)Q.specularIntensityMap=this.specularIntensityMap.toJSON($).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)Q.specularColorMap=this.specularColorMap.toJSON($).uuid;if(this.envMap&&this.envMap.isTexture){if(Q.envMap=this.envMap.toJSON($).uuid,this.combine!==void 0)Q.combine=this.combine}if(this.envMapRotation!==void 0)Q.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)Q.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)Q.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)Q.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)Q.gradientMap=this.gradientMap.toJSON($).uuid;if(this.transmission!==void 0)Q.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)Q.transmissionMap=this.transmissionMap.toJSON($).uuid;if(this.thickness!==void 0)Q.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)Q.thicknessMap=this.thicknessMap.toJSON($).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)Q.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)Q.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)Q.size=this.size;if(this.shadowSide!==null)Q.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)Q.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)Q.blending=this.blending;if(this.side!==0)Q.side=this.side;if(this.vertexColors===!0)Q.vertexColors=!0;if(this.opacity<1)Q.opacity=this.opacity;if(this.transparent===!0)Q.transparent=!0;if(this.blendSrc!==204)Q.blendSrc=this.blendSrc;if(this.blendDst!==205)Q.blendDst=this.blendDst;if(this.blendEquation!==100)Q.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)Q.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)Q.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)Q.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)Q.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)Q.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)Q.depthFunc=this.depthFunc;if(this.depthTest===!1)Q.depthTest=this.depthTest;if(this.depthWrite===!1)Q.depthWrite=this.depthWrite;if(this.colorWrite===!1)Q.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)Q.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)Q.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)Q.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)Q.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)Q.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)Q.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)Q.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)Q.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)Q.rotation=this.rotation;if(this.polygonOffset===!0)Q.polygonOffset=!0;if(this.polygonOffsetFactor!==0)Q.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)Q.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)Q.linewidth=this.linewidth;if(this.dashSize!==void 0)Q.dashSize=this.dashSize;if(this.gapSize!==void 0)Q.gapSize=this.gapSize;if(this.scale!==void 0)Q.scale=this.scale;if(this.dithering===!0)Q.dithering=!0;if(this.alphaTest>0)Q.alphaTest=this.alphaTest;if(this.alphaHash===!0)Q.alphaHash=!0;if(this.alphaToCoverage===!0)Q.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)Q.premultipliedAlpha=!0;if(this.forceSinglePass===!0)Q.forceSinglePass=!0;if(this.wireframe===!0)Q.wireframe=!0;if(this.wireframeLinewidth>1)Q.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")Q.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")Q.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)Q.flatShading=!0;if(this.visible===!1)Q.visible=!1;if(this.toneMapped===!1)Q.toneMapped=!1;if(this.fog===!1)Q.fog=!1;if(Object.keys(this.userData).length>0)Q.userData=this.userData;function Z(Y){let V=[];for(let q in Y){let U=Y[q];delete U.metadata,V.push(U)}return V}if(J){let Y=Z($.textures),V=Z($.images);if(Y.length>0)Q.textures=Y;if(V.length>0)Q.images=V}return Q}clone(){return new this.constructor().copy(this)}copy($){this.name=$.name,this.blending=$.blending,this.side=$.side,this.vertexColors=$.vertexColors,this.opacity=$.opacity,this.transparent=$.transparent,this.blendSrc=$.blendSrc,this.blendDst=$.blendDst,this.blendEquation=$.blendEquation,this.blendSrcAlpha=$.blendSrcAlpha,this.blendDstAlpha=$.blendDstAlpha,this.blendEquationAlpha=$.blendEquationAlpha,this.blendColor.copy($.blendColor),this.blendAlpha=$.blendAlpha,this.depthFunc=$.depthFunc,this.depthTest=$.depthTest,this.depthWrite=$.depthWrite,this.stencilWriteMask=$.stencilWriteMask,this.stencilFunc=$.stencilFunc,this.stencilRef=$.stencilRef,this.stencilFuncMask=$.stencilFuncMask,this.stencilFail=$.stencilFail,this.stencilZFail=$.stencilZFail,this.stencilZPass=$.stencilZPass,this.stencilWrite=$.stencilWrite;let J=$.clippingPlanes,Q=null;if(J!==null){let Z=J.length;Q=Array(Z);for(let Y=0;Y!==Z;++Y)Q[Y]=J[Y].clone()}return this.clippingPlanes=Q,this.clipIntersection=$.clipIntersection,this.clipShadows=$.clipShadows,this.shadowSide=$.shadowSide,this.colorWrite=$.colorWrite,this.precision=$.precision,this.polygonOffset=$.polygonOffset,this.polygonOffsetFactor=$.polygonOffsetFactor,this.polygonOffsetUnits=$.polygonOffsetUnits,this.dithering=$.dithering,this.alphaTest=$.alphaTest,this.alphaHash=$.alphaHash,this.alphaToCoverage=$.alphaToCoverage,this.premultipliedAlpha=$.premultipliedAlpha,this.forceSinglePass=$.forceSinglePass,this.visible=$.visible,this.toneMapped=$.toneMapped,this.userData=JSON.parse(JSON.stringify($.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate($){if($===!0)this.version++}};jZ=class jZ extends T7{constructor($){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new G$(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new e7,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.specularMap=$.specularMap,this.alphaMap=$.alphaMap,this.envMap=$.envMap,this.envMapRotation.copy($.envMapRotation),this.combine=$.combine,this.reflectivity=$.reflectivity,this.refractionRatio=$.refractionRatio,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.fog=$.fog,this}};x8=XF();C9=new s,aQ=new O$;kX=class kX extends K7{constructor($,J,Q){super(new Uint16Array($),J,Q)}};zX=class zX extends K7{constructor($,J,Q){super(new Uint32Array($),J,Q)}};U9=class U9 extends K7{constructor($,J,Q){super(new Float32Array($),J,Q)}};v7=new _$,KX=new N9,G6=new s,O7=new O8,kJ=new O8,f9=new s;u9=class u9 extends d5{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:KF++}),this.uuid=t7(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex($){if(Array.isArray($))this.index=new((QK($))?zX:kX)($,1);else this.index=$;return this}setIndirect($){return this.indirect=$,this}getIndirect(){return this.indirect}getAttribute($){return this.attributes[$]}setAttribute($,J){return this.attributes[$]=J,this}deleteAttribute($){return delete this.attributes[$],this}hasAttribute($){return this.attributes[$]!==void 0}addGroup($,J,Q=0){this.groups.push({start:$,count:J,materialIndex:Q})}clearGroups(){this.groups=[]}setDrawRange($,J){this.drawRange.start=$,this.drawRange.count=J}applyMatrix4($){let J=this.attributes.position;if(J!==void 0)J.applyMatrix4($),J.needsUpdate=!0;let Q=this.attributes.normal;if(Q!==void 0){let Y=new A$().getNormalMatrix($);Q.applyNormalMatrix(Y),Q.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection($),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion($){return v7.makeRotationFromQuaternion($),this.applyMatrix4(v7),this}rotateX($){return v7.makeRotationX($),this.applyMatrix4(v7),this}rotateY($){return v7.makeRotationY($),this.applyMatrix4(v7),this}rotateZ($){return v7.makeRotationZ($),this.applyMatrix4(v7),this}translate($,J,Q){return v7.makeTranslation($,J,Q),this.applyMatrix4(v7),this}scale($,J,Q){return v7.makeScale($,J,Q),this.applyMatrix4(v7),this}lookAt($){return KX.lookAt($),KX.updateMatrix(),this.applyMatrix4(KX.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(G6).negate(),this.translate(G6.x,G6.y,G6.z),this}setFromPoints($){let J=this.getAttribute("position");if(J===void 0){let Q=[];for(let Z=0,Y=$.length;Z<Y;Z++){let V=$[Z];Q.push(V.x,V.y,V.z||0)}this.setAttribute("position",new U9(Q,3))}else{let Q=Math.min($.length,J.count);for(let Z=0;Z<Q;Z++){let Y=$[Z];J.setXYZ(Z,Y.x,Y.y,Y.z||0)}if($.length>J.count)console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");J.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new O8;let $=this.attributes.position,J=this.morphAttributes.position;if($&&$.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new s(-1/0,-1/0,-1/0),new s(1/0,1/0,1/0));return}if($!==void 0){if(this.boundingBox.setFromBufferAttribute($),J)for(let Q=0,Z=J.length;Q<Z;Q++){let Y=J[Q];if(O7.setFromBufferAttribute(Y),this.morphTargetsRelative)f9.addVectors(this.boundingBox.min,O7.min),this.boundingBox.expandByPoint(f9),f9.addVectors(this.boundingBox.max,O7.max),this.boundingBox.expandByPoint(f9);else this.boundingBox.expandByPoint(O7.min),this.boundingBox.expandByPoint(O7.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new $8;let $=this.attributes.position,J=this.morphAttributes.position;if($&&$.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new s,1/0);return}if($){let Q=this.boundingSphere.center;if(O7.setFromBufferAttribute($),J)for(let Y=0,V=J.length;Y<V;Y++){let q=J[Y];if(kJ.setFromBufferAttribute(q),this.morphTargetsRelative)f9.addVectors(O7.min,kJ.min),O7.expandByPoint(f9),f9.addVectors(O7.max,kJ.max),O7.expandByPoint(f9);else O7.expandByPoint(kJ.min),O7.expandByPoint(kJ.max)}O7.getCenter(Q);let Z=0;for(let Y=0,V=$.count;Y<V;Y++)f9.fromBufferAttribute($,Y),Z=Math.max(Z,Q.distanceToSquared(f9));if(J)for(let Y=0,V=J.length;Y<V;Y++){let q=J[Y],U=this.morphTargetsRelative;for(let F=0,N=q.count;F<N;F++){if(f9.fromBufferAttribute(q,F),U)G6.fromBufferAttribute($,F),f9.add(G6);Z=Math.max(Z,Q.distanceToSquared(f9))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let $=this.index,J=this.attributes;if($===null||J.position===void 0||J.normal===void 0||J.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:Q,normal:Z,uv:Y}=J;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new K7(new Float32Array(4*Q.count),4));let V=this.getAttribute("tangent"),q=[],U=[];for(let b=0;b<Q.count;b++)q[b]=new s,U[b]=new s;let F=new s,N=new s,L=new s,I=new O$,P=new O$,C=new O$,M=new s,A=new s;function R(b,o,_){F.fromBufferAttribute(Q,b),N.fromBufferAttribute(Q,o),L.fromBufferAttribute(Q,_),I.fromBufferAttribute(Y,b),P.fromBufferAttribute(Y,o),C.fromBufferAttribute(Y,_),N.sub(F),L.sub(F),P.sub(I),C.sub(I);let z=1/(P.x*C.y-C.x*P.y);if(!isFinite(z))return;M.copy(N).multiplyScalar(C.y).addScaledVector(L,-P.y).multiplyScalar(z),A.copy(L).multiplyScalar(P.x).addScaledVector(N,-C.x).multiplyScalar(z),q[b].add(M),q[o].add(M),q[_].add(M),U[b].add(A),U[o].add(A),U[_].add(A)}let E=this.groups;if(E.length===0)E=[{start:0,count:$.count}];for(let b=0,o=E.length;b<o;++b){let _=E[b],z=_.start,x=_.count;for(let r=z,e=z+x;r<e;r+=3)R($.getX(r+0),$.getX(r+1),$.getX(r+2))}let y=new s,G=new s,f=new s,d=new s;function g(b){f.fromBufferAttribute(Z,b),d.copy(f);let o=q[b];y.copy(o),y.sub(f.multiplyScalar(f.dot(o))).normalize(),G.crossVectors(d,o);let z=G.dot(U[b])<0?-1:1;V.setXYZW(b,y.x,y.y,y.z,z)}for(let b=0,o=E.length;b<o;++b){let _=E[b],z=_.start,x=_.count;for(let r=z,e=z+x;r<e;r+=3)g($.getX(r+0)),g($.getX(r+1)),g($.getX(r+2))}}computeVertexNormals(){let $=this.index,J=this.getAttribute("position");if(J!==void 0){let Q=this.getAttribute("normal");if(Q===void 0)Q=new K7(new Float32Array(J.count*3),3),this.setAttribute("normal",Q);else for(let I=0,P=Q.count;I<P;I++)Q.setXYZ(I,0,0,0);let Z=new s,Y=new s,V=new s,q=new s,U=new s,F=new s,N=new s,L=new s;if($)for(let I=0,P=$.count;I<P;I+=3){let C=$.getX(I+0),M=$.getX(I+1),A=$.getX(I+2);Z.fromBufferAttribute(J,C),Y.fromBufferAttribute(J,M),V.fromBufferAttribute(J,A),N.subVectors(V,Y),L.subVectors(Z,Y),N.cross(L),q.fromBufferAttribute(Q,C),U.fromBufferAttribute(Q,M),F.fromBufferAttribute(Q,A),q.add(N),U.add(N),F.add(N),Q.setXYZ(C,q.x,q.y,q.z),Q.setXYZ(M,U.x,U.y,U.z),Q.setXYZ(A,F.x,F.y,F.z)}else for(let I=0,P=J.count;I<P;I+=3)Z.fromBufferAttribute(J,I+0),Y.fromBufferAttribute(J,I+1),V.fromBufferAttribute(J,I+2),N.subVectors(V,Y),L.subVectors(Z,Y),N.cross(L),Q.setXYZ(I+0,N.x,N.y,N.z),Q.setXYZ(I+1,N.x,N.y,N.z),Q.setXYZ(I+2,N.x,N.y,N.z);this.normalizeNormals(),Q.needsUpdate=!0}}normalizeNormals(){let $=this.attributes.normal;for(let J=0,Q=$.count;J<Q;J++)f9.fromBufferAttribute($,J),f9.normalize(),$.setXYZ(J,f9.x,f9.y,f9.z)}toNonIndexed(){function $(q,U){let{array:F,itemSize:N,normalized:L}=q,I=new F.constructor(U.length*N),P=0,C=0;for(let M=0,A=U.length;M<A;M++){if(q.isInterleavedBufferAttribute)P=U[M]*q.data.stride+q.offset;else P=U[M]*N;for(let R=0;R<N;R++)I[C++]=F[P++]}return new K7(I,N,L)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let J=new u9,Q=this.index.array,Z=this.attributes;for(let q in Z){let U=Z[q],F=$(U,Q);J.setAttribute(q,F)}let Y=this.morphAttributes;for(let q in Y){let U=[],F=Y[q];for(let N=0,L=F.length;N<L;N++){let I=F[N],P=$(I,Q);U.push(P)}J.morphAttributes[q]=U}J.morphTargetsRelative=this.morphTargetsRelative;let V=this.groups;for(let q=0,U=V.length;q<U;q++){let F=V[q];J.addGroup(F.start,F.count,F.materialIndex)}return J}toJSON(){let $={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if($.uuid=this.uuid,$.type=this.type,this.name!=="")$.name=this.name;if(Object.keys(this.userData).length>0)$.userData=this.userData;if(this.parameters!==void 0){let U=this.parameters;for(let F in U)if(U[F]!==void 0)$[F]=U[F];return $}$.data={attributes:{}};let J=this.index;if(J!==null)$.data.index={type:J.array.constructor.name,array:Array.prototype.slice.call(J.array)};let Q=this.attributes;for(let U in Q){let F=Q[U];$.data.attributes[U]=F.toJSON($.data)}let Z={},Y=!1;for(let U in this.morphAttributes){let F=this.morphAttributes[U],N=[];for(let L=0,I=F.length;L<I;L++){let P=F[L];N.push(P.toJSON($.data))}if(N.length>0)Z[U]=N,Y=!0}if(Y)$.data.morphAttributes=Z,$.data.morphTargetsRelative=this.morphTargetsRelative;let V=this.groups;if(V.length>0)$.data.groups=JSON.parse(JSON.stringify(V));let q=this.boundingSphere;if(q!==null)$.data.boundingSphere=q.toJSON();return $}clone(){return new this.constructor().copy(this)}copy($){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let J={};this.name=$.name;let Q=$.index;if(Q!==null)this.setIndex(Q.clone());let Z=$.attributes;for(let F in Z){let N=Z[F];this.setAttribute(F,N.clone(J))}let Y=$.morphAttributes;for(let F in Y){let N=[],L=Y[F];for(let I=0,P=L.length;I<P;I++)N.push(L[I].clone(J));this.morphAttributes[F]=N}this.morphTargetsRelative=$.morphTargetsRelative;let V=$.groups;for(let F=0,N=V.length;F<N;F++){let L=V[F];this.addGroup(L.start,L.count,L.materialIndex)}let q=$.boundingBox;if(q!==null)this.boundingBox=q.clone();let U=$.boundingSphere;if(U!==null)this.boundingSphere=U.clone();return this.drawRange.start=$.drawRange.start,this.drawRange.count=$.drawRange.count,this.userData=$.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}};VV=new _$,h5=new cJ,rQ=new $8,KV=new s,tQ=new s,eQ=new s,$Z=new s,UX=new s,JZ=new s,UV=new s,QZ=new s;V7=class V7 extends N9{constructor($=new u9,J=new jZ){super();this.isMesh=!0,this.type="Mesh",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy($,J){if(super.copy($,J),$.morphTargetInfluences!==void 0)this.morphTargetInfluences=$.morphTargetInfluences.slice();if($.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},$.morphTargetDictionary);return this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Y=0,V=Z.length;Y<V;Y++){let q=Z[Y].name||String(Y);this.morphTargetInfluences.push(0),this.morphTargetDictionary[q]=Y}}}}getVertexPosition($,J){let Q=this.geometry,Z=Q.attributes.position,Y=Q.morphAttributes.position,V=Q.morphTargetsRelative;J.fromBufferAttribute(Z,$);let q=this.morphTargetInfluences;if(Y&&q){JZ.set(0,0,0);for(let U=0,F=Y.length;U<F;U++){let N=q[U],L=Y[U];if(N===0)continue;if(UX.fromBufferAttribute(L,$),V)JZ.addScaledVector(UX,N);else JZ.addScaledVector(UX.sub(J),N)}J.add(JZ)}return J}raycast($,J){let Q=this.geometry,Z=this.material,Y=this.matrixWorld;if(Z===void 0)return;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(rQ.copy(Q.boundingSphere),rQ.applyMatrix4(Y),h5.copy($.ray).recast($.near),rQ.containsPoint(h5.origin)===!1){if(h5.intersectSphere(rQ,KV)===null)return;if(h5.origin.distanceToSquared(KV)>($.far-$.near)**2)return}if(VV.copy(Y).invert(),h5.copy($.ray).applyMatrix4(VV),Q.boundingBox!==null){if(h5.intersectsBox(Q.boundingBox)===!1)return}this._computeIntersections($,J,h5)}_computeIntersections($,J,Q){let Z,Y=this.geometry,V=this.material,q=Y.index,U=Y.attributes.position,F=Y.attributes.uv,N=Y.attributes.uv1,L=Y.attributes.normal,I=Y.groups,P=Y.drawRange;if(q!==null)if(Array.isArray(V))for(let C=0,M=I.length;C<M;C++){let A=I[C],R=V[A.materialIndex],E=Math.max(A.start,P.start),y=Math.min(q.count,Math.min(A.start+A.count,P.start+P.count));for(let G=E,f=y;G<f;G+=3){let d=q.getX(G),g=q.getX(G+1),b=q.getX(G+2);if(Z=ZZ(this,R,$,Q,F,N,L,d,g,b),Z)Z.faceIndex=Math.floor(G/3),Z.face.materialIndex=A.materialIndex,J.push(Z)}}else{let C=Math.max(0,P.start),M=Math.min(q.count,P.start+P.count);for(let A=C,R=M;A<R;A+=3){let E=q.getX(A),y=q.getX(A+1),G=q.getX(A+2);if(Z=ZZ(this,V,$,Q,F,N,L,E,y,G),Z)Z.faceIndex=Math.floor(A/3),J.push(Z)}}else if(U!==void 0)if(Array.isArray(V))for(let C=0,M=I.length;C<M;C++){let A=I[C],R=V[A.materialIndex],E=Math.max(A.start,P.start),y=Math.min(U.count,Math.min(A.start+A.count,P.start+P.count));for(let G=E,f=y;G<f;G+=3){let d=G,g=G+1,b=G+2;if(Z=ZZ(this,R,$,Q,F,N,L,d,g,b),Z)Z.faceIndex=Math.floor(G/3),Z.face.materialIndex=A.materialIndex,J.push(Z)}}else{let C=Math.max(0,P.start),M=Math.min(U.count,P.start+P.count);for(let A=C,R=M;A<R;A+=3){let E=A,y=A+1,G=A+2;if(Z=ZZ(this,V,$,Q,F,N,L,E,y,G),Z)Z.faceIndex=Math.floor(A/3),J.push(Z)}}}};h6=class h6 extends u9{constructor($=1,J=1,Q=1,Z=1,Y=1,V=1){super();this.type="BoxGeometry",this.parameters={width:$,height:J,depth:Q,widthSegments:Z,heightSegments:Y,depthSegments:V};let q=this;Z=Math.floor(Z),Y=Math.floor(Y),V=Math.floor(V);let U=[],F=[],N=[],L=[],I=0,P=0;C("z","y","x",-1,-1,Q,J,$,V,Y,0),C("z","y","x",1,-1,Q,J,-$,V,Y,1),C("x","z","y",1,1,$,Q,J,Z,V,2),C("x","z","y",1,-1,$,Q,-J,Z,V,3),C("x","y","z",1,-1,$,J,Q,Z,Y,4),C("x","y","z",-1,-1,$,J,-Q,Z,Y,5),this.setIndex(U),this.setAttribute("position",new U9(F,3)),this.setAttribute("normal",new U9(N,3)),this.setAttribute("uv",new U9(L,2));function C(M,A,R,E,y,G,f,d,g,b,o){let _=G/g,z=f/b,x=G/2,r=f/2,e=d/2,Q0=g+1,J0=b+1,K0=0,F0=0,U0=new s;for(let C0=0;C0<J0;C0++){let x0=C0*z-r;for(let e0=0;e0<Q0;e0++){let p0=e0*_-x;U0[M]=p0*E,U0[A]=x0*y,U0[R]=e,F.push(U0.x,U0.y,U0.z),U0[M]=0,U0[A]=0,U0[R]=d>0?1:-1,N.push(U0.x,U0.y,U0.z),L.push(e0/g),L.push(1-C0/b),K0+=1}}for(let C0=0;C0<b;C0++)for(let x0=0;x0<g;x0++){let e0=I+x0+Q0*C0,p0=I+x0+Q0*(C0+1),z$=I+(x0+1)+Q0*(C0+1),M$=I+(x0+1)+Q0*C0;U.push(e0,p0,M$),U.push(p0,z$,M$),F0+=6}q.addGroup(P,F0,o),P+=F0,I+=K0}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new h6($.width,$.height,$.depth,$.widthSegments,$.heightSegments,$.depthSegments)}};HF={clone:y6,merge:J7};N8=class N8 extends T7{constructor($){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=FF,this.fragmentShader=BF,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,$!==void 0)this.setValues($)}copy($){return super.copy($),this.fragmentShader=$.fragmentShader,this.vertexShader=$.vertexShader,this.uniforms=y6($.uniforms),this.uniformsGroups=qF($.uniformsGroups),this.defines=Object.assign({},$.defines),this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.fog=$.fog,this.lights=$.lights,this.clipping=$.clipping,this.extensions=Object.assign({},$.extensions),this.glslVersion=$.glslVersion,this}toJSON($){let J=super.toJSON($);J.glslVersion=this.glslVersion,J.uniforms={};for(let Z in this.uniforms){let V=this.uniforms[Z].value;if(V&&V.isTexture)J.uniforms[Z]={type:"t",value:V.toJSON($).uuid};else if(V&&V.isColor)J.uniforms[Z]={type:"c",value:V.getHex()};else if(V&&V.isVector2)J.uniforms[Z]={type:"v2",value:V.toArray()};else if(V&&V.isVector3)J.uniforms[Z]={type:"v3",value:V.toArray()};else if(V&&V.isVector4)J.uniforms[Z]={type:"v4",value:V.toArray()};else if(V&&V.isMatrix3)J.uniforms[Z]={type:"m3",value:V.toArray()};else if(V&&V.isMatrix4)J.uniforms[Z]={type:"m4",value:V.toArray()};else J.uniforms[Z]={value:V}}if(Object.keys(this.defines).length>0)J.defines=this.defines;J.vertexShader=this.vertexShader,J.fragmentShader=this.fragmentShader,J.lights=this.lights,J.clipping=this.clipping;let Q={};for(let Z in this.extensions)if(this.extensions[Z]===!0)Q[Z]=!0;if(Object.keys(Q).length>0)J.extensions=Q;return J}};wX=class wX extends N9{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new _$,this.projectionMatrix=new _$,this.projectionMatrixInverse=new _$,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy($,J){return super.copy($,J),this.matrixWorldInverse.copy($.matrixWorldInverse),this.projectionMatrix.copy($.projectionMatrix),this.projectionMatrixInverse.copy($.projectionMatrixInverse),this.coordinateSystem=$.coordinateSystem,this}getWorldDirection($){return super.getWorldDirection($).negate()}updateMatrixWorld($){super.updateMatrixWorld($),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix($,J){super.updateWorldMatrix($,J),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}};F5=new s,qV=new O$,HV=new O$;Q7=class Q7 extends wX{constructor($=50,J=1,Q=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=$,this.zoom=1,this.near=Q,this.far=Z,this.focus=10,this.aspect=J,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy($,J){return super.copy($,J),this.fov=$.fov,this.zoom=$.zoom,this.near=$.near,this.far=$.far,this.focus=$.focus,this.aspect=$.aspect,this.view=$.view===null?null:Object.assign({},$.view),this.filmGauge=$.filmGauge,this.filmOffset=$.filmOffset,this}setFocalLength($){let J=0.5*this.getFilmHeight()/$;this.fov=_6*2*Math.atan(J),this.updateProjectionMatrix()}getFocalLength(){let $=Math.tan(gJ*0.5*this.fov);return 0.5*this.getFilmHeight()/$}getEffectiveFOV(){return _6*2*Math.atan(Math.tan(gJ*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds($,J,Q){F5.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),J.set(F5.x,F5.y).multiplyScalar(-$/F5.z),F5.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(F5.x,F5.y).multiplyScalar(-$/F5.z)}getViewSize($,J){return this.getViewBounds($,qV,HV),J.subVectors(HV,qV)}setViewOffset($,J,Q,Z,Y,V){if(this.aspect=$/J,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=$,this.view.fullHeight=J,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=Y,this.view.height=V,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let $=this.near,J=$*Math.tan(gJ*0.5*this.fov)/this.zoom,Q=2*J,Z=this.aspect*Q,Y=-0.5*Z,V=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:U,fullHeight:F}=V;Y+=V.offsetX*Z/U,J-=V.offsetY*Q/F,Z*=V.width/U,Q*=V.height/F}let q=this.filmOffset;if(q!==0)Y+=$*q/this.getFilmWidth();this.projectionMatrix.makePerspective(Y,Y+Z,J,J-Q,$,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON($){let J=super.toJSON($);if(J.object.fov=this.fov,J.object.zoom=this.zoom,J.object.near=this.near,J.object.far=this.far,J.object.focus=this.focus,J.object.aspect=this.aspect,this.view!==null)J.object.view=Object.assign({},this.view);return J.object.filmGauge=this.filmGauge,J.object.filmOffset=this.filmOffset,J}};UK=class UK extends N9{constructor($,J,Q){super();this.type="CubeCamera",this.renderTarget=Q,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new Q7(E6,R6,$,J);Z.layers=this.layers,this.add(Z);let Y=new Q7(E6,R6,$,J);Y.layers=this.layers,this.add(Y);let V=new Q7(E6,R6,$,J);V.layers=this.layers,this.add(V);let q=new Q7(E6,R6,$,J);q.layers=this.layers,this.add(q);let U=new Q7(E6,R6,$,J);U.layers=this.layers,this.add(U);let F=new Q7(E6,R6,$,J);F.layers=this.layers,this.add(F)}updateCoordinateSystem(){let $=this.coordinateSystem,J=this.children.concat(),[Q,Z,Y,V,q,U]=J;for(let F of J)this.remove(F);if($===2000)Q.up.set(0,1,0),Q.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),Y.up.set(0,0,-1),Y.lookAt(0,1,0),V.up.set(0,0,1),V.lookAt(0,-1,0),q.up.set(0,1,0),q.lookAt(0,0,1),U.up.set(0,1,0),U.lookAt(0,0,-1);else if($===2001)Q.up.set(0,-1,0),Q.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),Y.up.set(0,0,1),Y.lookAt(0,1,0),V.up.set(0,0,-1),V.lookAt(0,-1,0),q.up.set(0,-1,0),q.lookAt(0,0,1),U.up.set(0,-1,0),U.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+$);for(let F of J)this.add(F),F.updateMatrixWorld()}update($,J){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:Q,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==$.coordinateSystem)this.coordinateSystem=$.coordinateSystem,this.updateCoordinateSystem();let[Y,V,q,U,F,N]=this.children,L=$.getRenderTarget(),I=$.getActiveCubeFace(),P=$.getActiveMipmapLevel(),C=$.xr.enabled;$.xr.enabled=!1;let M=Q.texture.generateMipmaps;Q.texture.generateMipmaps=!1,$.setRenderTarget(Q,0,Z),$.render(J,Y),$.setRenderTarget(Q,1,Z),$.render(J,V),$.setRenderTarget(Q,2,Z),$.render(J,q),$.setRenderTarget(Q,3,Z),$.render(J,U),$.setRenderTarget(Q,4,Z),$.render(J,F),Q.texture.generateMipmaps=M,$.setRenderTarget(Q,5,Z),$.render(J,N),$.setRenderTarget(L,I,P),$.xr.enabled=C,Q.texture.needsPMREMUpdate=!0}};_X=class _X extends b9{constructor($=[],J=301,Q,Z,Y,V,q,U,F,N){super($,J,Q,Z,Y,V,q,U,F,N);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images($){this.image=$}};qK=class qK extends p8{constructor($=1,J={}){super($,$,J);this.isWebGLCubeRenderTarget=!0;let Q={width:$,height:$,depth:1},Z=[Q,Q,Q,Q,Q,Q];this.texture=new _X(Z),this._setTextureOptions(J),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture($,J){this.texture.type=J.type,this.texture.colorSpace=J.colorSpace,this.texture.generateMipmaps=J.generateMipmaps,this.texture.minFilter=J.minFilter,this.texture.magFilter=J.magFilter;let Q={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new h6(5,5,5),Y=new N8({name:"CubemapFromEquirect",uniforms:y6(Q.uniforms),vertexShader:Q.vertexShader,fragmentShader:Q.fragmentShader,side:1,blending:0});Y.uniforms.tEquirect.value=J;let V=new V7(Z,Y),q=J.minFilter;if(J.minFilter===1008)J.minFilter=1006;return new UK(1,10,this).update($,V),J.minFilter=q,V.geometry.dispose(),V.material.dispose(),this}clear($,J=!0,Q=!0,Z=!0){let Y=$.getRenderTarget();for(let V=0;V<6;V++)$.setRenderTarget(this,V),$.clear(J,Q,Z);$.setRenderTarget(Y)}};k6=class k6 extends N9{constructor(){super();this.isGroup=!0,this.type="Group"}};NF={type:"move"};HK=class HK extends N9{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new e7,this.environmentIntensity=1,this.environmentRotation=new e7,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy($,J){if(super.copy($,J),$.background!==null)this.background=$.background.clone();if($.environment!==null)this.environment=$.environment.clone();if($.fog!==null)this.fog=$.fog.clone();if(this.backgroundBlurriness=$.backgroundBlurriness,this.backgroundIntensity=$.backgroundIntensity,this.backgroundRotation.copy($.backgroundRotation),this.environmentIntensity=$.environmentIntensity,this.environmentRotation.copy($.environmentRotation),$.overrideMaterial!==null)this.overrideMaterial=$.overrideMaterial.clone();return this.matrixAutoUpdate=$.matrixAutoUpdate,this}toJSON($){let J=super.toJSON($);if(this.fog!==null)J.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)J.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)J.object.backgroundIntensity=this.backgroundIntensity;if(J.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)J.object.environmentIntensity=this.environmentIntensity;return J.object.environmentRotation=this.environmentRotation.toArray(),J}};$7=new s;bX=class bX extends T7{constructor($){super();this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new G$(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.alphaMap=$.alphaMap,this.rotation=$.rotation,this.sizeAttenuation=$.sizeAttenuation,this.fog=$.fog,this}};zJ=new s,C6=new s,M6=new s,v6=new O$,wJ=new O$,FK=new _$,XZ=new s,_J=new s,WZ=new s,FV=new O$,qX=new O$,BV=new O$;BK=class BK extends N9{constructor($=new bX){super();if(this.isSprite=!0,this.type="Sprite",j6===void 0){j6=new u9;let J=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),Q=new fX(J,5);j6.setIndex([0,1,2,0,2,3]),j6.setAttribute("position",new mJ(Q,3,0,!1)),j6.setAttribute("uv",new mJ(Q,2,3,!1))}this.geometry=j6,this.material=$,this.center=new O$(0.5,0.5),this.count=1}raycast($,J){if($.camera===null)console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(C6.setFromMatrixScale(this.matrixWorld),FK.copy($.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices($.camera.matrixWorldInverse,this.matrixWorld),M6.setFromMatrixPosition(this.modelViewMatrix),$.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)C6.multiplyScalar(-M6.z);let Q=this.material.rotation,Z,Y;if(Q!==0)Y=Math.cos(Q),Z=Math.sin(Q);let V=this.center;YZ(XZ.set(-0.5,-0.5,0),M6,V,C6,Z,Y),YZ(_J.set(0.5,-0.5,0),M6,V,C6,Z,Y),YZ(WZ.set(0.5,0.5,0),M6,V,C6,Z,Y),FV.set(0,0),qX.set(1,0),BV.set(1,1);let q=$.ray.intersectTriangle(XZ,_J,WZ,!1,zJ);if(q===null){if(YZ(_J.set(-0.5,0.5,0),M6,V,C6,Z,Y),qX.set(0,1),q=$.ray.intersectTriangle(XZ,WZ,_J,!1,zJ),q===null)return}let U=$.ray.origin.distanceTo(zJ);if(U<$.near||U>$.far)return;J.push({distance:U,point:zJ.clone(),uv:A7.getInterpolation(zJ,XZ,_J,WZ,FV,qX,BV,new O$),face:null,object:this})}copy($,J){if(super.copy($,J),$.center!==void 0)this.center.copy($.center);return this.material=$.material,this}};NV=new s,OV=new a$,LV=new a$,OF=new s,IV=new _$,VZ=new s,HX=new $8,DV=new _$,FX=new cJ;NK=class NK extends V7{constructor($,J){super($,J);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new _$,this.bindMatrixInverse=new _$,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let $=this.geometry;if(this.boundingBox===null)this.boundingBox=new O8;this.boundingBox.makeEmpty();let J=$.getAttribute("position");for(let Q=0;Q<J.count;Q++)this.getVertexPosition(Q,VZ),this.boundingBox.expandByPoint(VZ)}computeBoundingSphere(){let $=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new $8;this.boundingSphere.makeEmpty();let J=$.getAttribute("position");for(let Q=0;Q<J.count;Q++)this.getVertexPosition(Q,VZ),this.boundingSphere.expandByPoint(VZ)}copy($,J){if(super.copy($,J),this.bindMode=$.bindMode,this.bindMatrix.copy($.bindMatrix),this.bindMatrixInverse.copy($.bindMatrixInverse),this.skeleton=$.skeleton,$.boundingBox!==null)this.boundingBox=$.boundingBox.clone();if($.boundingSphere!==null)this.boundingSphere=$.boundingSphere.clone();return this}raycast($,J){let Q=this.material,Z=this.matrixWorld;if(Q===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(HX.copy(this.boundingSphere),HX.applyMatrix4(Z),$.ray.intersectsSphere(HX)===!1)return;if(DV.copy(Z).invert(),FX.copy($.ray).applyMatrix4(DV),this.boundingBox!==null){if(FX.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections($,J,FX)}getVertexPosition($,J){return super.getVertexPosition($,J),this.applyBoneTransform($,J),J}bind($,J){if(this.skeleton=$,J===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),J=this.matrixWorld;this.bindMatrix.copy(J),this.bindMatrixInverse.copy(J).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let $=new a$,J=this.geometry.attributes.skinWeight;for(let Q=0,Z=J.count;Q<Z;Q++){$.fromBufferAttribute(J,Q);let Y=1/$.manhattanLength();if(Y!==1/0)$.multiplyScalar(Y);else $.set(1,0,0,0);J.setXYZW(Q,$.x,$.y,$.z,$.w)}}updateMatrixWorld($){if(super.updateMatrixWorld($),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform($,J){let Q=this.skeleton,Z=this.geometry;OV.fromBufferAttribute(Z.attributes.skinIndex,$),LV.fromBufferAttribute(Z.attributes.skinWeight,$),NV.copy(J).applyMatrix4(this.bindMatrix),J.set(0,0,0);for(let Y=0;Y<4;Y++){let V=LV.getComponent(Y);if(V!==0){let q=OV.getComponent(Y);IV.multiplyMatrices(Q.bones[q].matrixWorld,Q.boneInverses[q]),J.addScaledVector(OF.copy(NV).applyMatrix4(IV),V)}}return J.applyMatrix4(this.bindMatrixInverse)}};hX=class hX extends N9{constructor(){super();this.isBone=!0,this.type="Bone"}};oJ=class oJ extends b9{constructor($=null,J=1,Q=1,Z,Y,V,q,U,F=1003,N=1003,L,I){super(null,V,q,U,F,N,Z,Y,L,I);this.isDataTexture=!0,this.image={data:$,width:J,height:Q},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};PV=new _$,LF=new _$;PZ=class PZ extends K7{constructor($,J,Q,Z=1){super($,J,Q);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=Z}copy($){return super.copy($),this.meshPerAttribute=$.meshPerAttribute,this}toJSON(){let $=super.toJSON();return $.meshPerAttribute=this.meshPerAttribute,$.isInstancedBufferAttribute=!0,$}};A6=new _$,GV=new _$,KZ=[],EV=new O8,IF=new _$,yJ=new V7,fJ=new $8;OK=class OK extends V7{constructor($,J,Q){super($,J);this.isInstancedMesh=!0,this.instanceMatrix=new PZ(new Float32Array(Q*16),16),this.instanceColor=null,this.morphTexture=null,this.count=Q,this.boundingBox=null,this.boundingSphere=null;for(let Z=0;Z<Q;Z++)this.setMatrixAt(Z,IF)}computeBoundingBox(){let $=this.geometry,J=this.count;if(this.boundingBox===null)this.boundingBox=new O8;if($.boundingBox===null)$.computeBoundingBox();this.boundingBox.makeEmpty();for(let Q=0;Q<J;Q++)this.getMatrixAt(Q,A6),EV.copy($.boundingBox).applyMatrix4(A6),this.boundingBox.union(EV)}computeBoundingSphere(){let $=this.geometry,J=this.count;if(this.boundingSphere===null)this.boundingSphere=new $8;if($.boundingSphere===null)$.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let Q=0;Q<J;Q++)this.getMatrixAt(Q,A6),fJ.copy($.boundingSphere).applyMatrix4(A6),this.boundingSphere.union(fJ)}copy($,J){if(super.copy($,J),this.instanceMatrix.copy($.instanceMatrix),$.morphTexture!==null)this.morphTexture=$.morphTexture.clone();if($.instanceColor!==null)this.instanceColor=$.instanceColor.clone();if(this.count=$.count,$.boundingBox!==null)this.boundingBox=$.boundingBox.clone();if($.boundingSphere!==null)this.boundingSphere=$.boundingSphere.clone();return this}getColorAt($,J){J.fromArray(this.instanceColor.array,$*3)}getMatrixAt($,J){J.fromArray(this.instanceMatrix.array,$*16)}getMorphAt($,J){let Q=J.morphTargetInfluences,Z=this.morphTexture.source.data.data,Y=Q.length+1,V=$*Y+1;for(let q=0;q<Q.length;q++)Q[q]=Z[V+q]}raycast($,J){let Q=this.matrixWorld,Z=this.count;if(yJ.geometry=this.geometry,yJ.material=this.material,yJ.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(fJ.copy(this.boundingSphere),fJ.applyMatrix4(Q),$.ray.intersectsSphere(fJ)===!1)return;for(let Y=0;Y<Z;Y++){this.getMatrixAt(Y,A6),GV.multiplyMatrices(Q,A6),yJ.matrixWorld=GV,yJ.raycast($,KZ);for(let V=0,q=KZ.length;V<q;V++){let U=KZ[V];U.instanceId=Y,U.object=this,J.push(U)}KZ.length=0}}setColorAt($,J){if(this.instanceColor===null)this.instanceColor=new PZ(new Float32Array(this.instanceMatrix.count*3).fill(1),3);J.toArray(this.instanceColor.array,$*3)}setMatrixAt($,J){J.toArray(this.instanceMatrix.array,$*16)}setMorphAt($,J){let Q=J.morphTargetInfluences,Z=Q.length+1;if(this.morphTexture===null)this.morphTexture=new oJ(new Float32Array(Z*this.count),Z,this.count,1028,1015);let Y=this.morphTexture.source.data.data,V=0;for(let F=0;F<Q.length;F++)V+=Q[F];let q=this.geometry.morphTargetsRelative?1:1-V,U=Z*$;Y[U]=q,Y.set(Q,U+1)}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}};BX=new s,DF=new s,PF=new A$;x5=new $8,GF=new O$(0.5,0.5),UZ=new s;gX=class gX extends T7{constructor($){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new G$(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.linewidth=$.linewidth,this.linecap=$.linecap,this.linejoin=$.linejoin,this.fog=$.fog,this}};GZ=new s,EZ=new s,RV=new _$,bJ=new cJ,qZ=new $8,NX=new s,jV=new s;MZ=class MZ extends N9{constructor($=new u9,J=new gX){super();this.isLine=!0,this.type="Line",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy($,J){return super.copy($,J),this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}computeLineDistances(){let $=this.geometry;if($.index===null){let J=$.attributes.position,Q=[0];for(let Z=1,Y=J.count;Z<Y;Z++)GZ.fromBufferAttribute(J,Z-1),EZ.fromBufferAttribute(J,Z),Q[Z]=Q[Z-1],Q[Z]+=GZ.distanceTo(EZ);$.setAttribute("lineDistance",new U9(Q,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast($,J){let Q=this.geometry,Z=this.matrixWorld,Y=$.params.Line.threshold,V=Q.drawRange;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(qZ.copy(Q.boundingSphere),qZ.applyMatrix4(Z),qZ.radius+=Y,$.ray.intersectsSphere(qZ)===!1)return;RV.copy(Z).invert(),bJ.copy($.ray).applyMatrix4(RV);let q=Y/((this.scale.x+this.scale.y+this.scale.z)/3),U=q*q,F=this.isLineSegments?2:1,N=Q.index,I=Q.attributes.position;if(N!==null){let P=Math.max(0,V.start),C=Math.min(N.count,V.start+V.count);for(let M=P,A=C-1;M<A;M+=F){let R=N.getX(M),E=N.getX(M+1),y=HZ(this,$,bJ,U,R,E,M);if(y)J.push(y)}if(this.isLineLoop){let M=N.getX(C-1),A=N.getX(P),R=HZ(this,$,bJ,U,M,A,C-1);if(R)J.push(R)}}else{let P=Math.max(0,V.start),C=Math.min(I.count,V.start+V.count);for(let M=P,A=C-1;M<A;M+=F){let R=HZ(this,$,bJ,U,M,M+1,M);if(R)J.push(R)}if(this.isLineLoop){let M=HZ(this,$,bJ,U,C-1,P,C-1);if(M)J.push(M)}}}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Y=0,V=Z.length;Y<V;Y++){let q=Z[Y].name||String(Y);this.morphTargetInfluences.push(0),this.morphTargetDictionary[q]=Y}}}}};CV=new s,MV=new s;LK=class LK extends MZ{constructor($,J){super($,J);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let $=this.geometry;if($.index===null){let J=$.attributes.position,Q=[];for(let Z=0,Y=J.count;Z<Y;Z+=2)CV.fromBufferAttribute(J,Z),MV.fromBufferAttribute(J,Z+1),Q[Z]=Z===0?0:Q[Z-1],Q[Z+1]=Q[Z]+CV.distanceTo(MV);$.setAttribute("lineDistance",new U9(Q,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};IK=class IK extends MZ{constructor($,J){super($,J);this.isLineLoop=!0,this.type="LineLoop"}};uX=class uX extends T7{constructor($){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new G$(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.alphaMap=$.alphaMap,this.size=$.size,this.sizeAttenuation=$.sizeAttenuation,this.fog=$.fog,this}};vV=new _$,CX=new cJ,FZ=new $8,BZ=new s;DK=class DK extends N9{constructor($=new u9,J=new uX){super();this.isPoints=!0,this.type="Points",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy($,J){return super.copy($,J),this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}raycast($,J){let Q=this.geometry,Z=this.matrixWorld,Y=$.params.Points.threshold,V=Q.drawRange;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(FZ.copy(Q.boundingSphere),FZ.applyMatrix4(Z),FZ.radius+=Y,$.ray.intersectsSphere(FZ)===!1)return;vV.copy(Z).invert(),CX.copy($.ray).applyMatrix4(vV);let q=Y/((this.scale.x+this.scale.y+this.scale.z)/3),U=q*q,F=Q.index,L=Q.attributes.position;if(F!==null){let I=Math.max(0,V.start),P=Math.min(F.count,V.start+V.count);for(let C=I,M=P;C<M;C++){let A=F.getX(C);BZ.fromBufferAttribute(L,A),AV(BZ,A,U,Z,$,J,this)}}else{let I=Math.max(0,V.start),P=Math.min(L.count,V.start+V.count);for(let C=I,M=P;C<M;C++)BZ.fromBufferAttribute(L,C),AV(BZ,C,U,Z,$,J,this)}}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Y=0,V=Z.length;Y<V;Y++){let q=Z[Y].name||String(Y);this.morphTargetInfluences.push(0),this.morphTargetDictionary[q]=Y}}}}};PK=class PK extends b9{constructor($,J,Q,Z,Y,V,q,U,F){super($,J,Q,Z,Y,V,q,U,F);this.isCanvasTexture=!0,this.needsUpdate=!0}};pX=class pX extends b9{constructor($,J,Q=1014,Z,Y,V,q=1003,U=1003,F,N=1026,L=1){if(N!==1026&&N!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let I={width:$,height:J,depth:L};super(I,Z,Y,V,q,U,N,Q,F);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy($){return super.copy($),this.source=new RZ(Object.assign({},$.image)),this.compareFunction=$.compareFunction,this}toJSON($){let J=super.toJSON($);if(this.compareFunction!==null)J.compareFunction=this.compareFunction;return J}};lX=class lX extends b9{constructor($=null){super();this.sourceTexture=$,this.isExternalTexture=!0}copy($){return super.copy($),this.sourceTexture=$.sourceTexture,this}};dX=class dX extends u9{constructor($=1,J=32,Q=0,Z=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:$,segments:J,thetaStart:Q,thetaLength:Z},J=Math.max(3,J);let Y=[],V=[],q=[],U=[],F=new s,N=new O$;V.push(0,0,0),q.push(0,0,1),U.push(0.5,0.5);for(let L=0,I=3;L<=J;L++,I+=3){let P=Q+L/J*Z;F.x=$*Math.cos(P),F.y=$*Math.sin(P),V.push(F.x,F.y,F.z),q.push(0,0,1),N.x=(V[I]/$+1)/2,N.y=(V[I+1]/$+1)/2,U.push(N.x,N.y)}for(let L=1;L<=J;L++)Y.push(L,L+1,0);this.setIndex(Y),this.setAttribute("position",new U9(V,3)),this.setAttribute("normal",new U9(q,3)),this.setAttribute("uv",new U9(U,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new dX($.radius,$.segments,$.thetaStart,$.thetaLength)}};vZ=class vZ extends u9{constructor($=1,J=1,Q=1,Z=32,Y=1,V=!1,q=0,U=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:$,radiusBottom:J,height:Q,radialSegments:Z,heightSegments:Y,openEnded:V,thetaStart:q,thetaLength:U};let F=this;Z=Math.floor(Z),Y=Math.floor(Y);let N=[],L=[],I=[],P=[],C=0,M=[],A=Q/2,R=0;if(E(),V===!1){if($>0)y(!0);if(J>0)y(!1)}this.setIndex(N),this.setAttribute("position",new U9(L,3)),this.setAttribute("normal",new U9(I,3)),this.setAttribute("uv",new U9(P,2));function E(){let G=new s,f=new s,d=0,g=(J-$)/Q;for(let b=0;b<=Y;b++){let o=[],_=b/Y,z=_*(J-$)+$;for(let x=0;x<=Z;x++){let r=x/Z,e=r*U+q,Q0=Math.sin(e),J0=Math.cos(e);f.x=z*Q0,f.y=-_*Q+A,f.z=z*J0,L.push(f.x,f.y,f.z),G.set(Q0,g,J0).normalize(),I.push(G.x,G.y,G.z),P.push(r,1-_),o.push(C++)}M.push(o)}for(let b=0;b<Z;b++)for(let o=0;o<Y;o++){let _=M[o][b],z=M[o+1][b],x=M[o+1][b+1],r=M[o][b+1];if($>0||o!==0)N.push(_,z,r),d+=3;if(J>0||o!==Y-1)N.push(z,x,r),d+=3}F.addGroup(R,d,0),R+=d}function y(G){let f=C,d=new O$,g=new s,b=0,o=G===!0?$:J,_=G===!0?1:-1;for(let x=1;x<=Z;x++)L.push(0,A*_,0),I.push(0,_,0),P.push(0.5,0.5),C++;let z=C;for(let x=0;x<=Z;x++){let e=x/Z*U+q,Q0=Math.cos(e),J0=Math.sin(e);g.x=o*J0,g.y=A*_,g.z=o*Q0,L.push(g.x,g.y,g.z),I.push(0,_,0),d.x=Q0*0.5+0.5,d.y=J0*0.5*_+0.5,P.push(d.x,d.y),C++}for(let x=0;x<Z;x++){let r=f+x,e=z+x;if(G===!0)N.push(e,e+1,r);else N.push(e+1,e,r);b+=3}F.addGroup(R,b,G===!0?1:2),R+=b}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new vZ($.radiusTop,$.radiusBottom,$.height,$.radialSegments,$.heightSegments,$.openEnded,$.thetaStart,$.thetaLength)}};mX=class mX extends vZ{constructor($=1,J=1,Q=32,Z=1,Y=!1,V=0,q=Math.PI*2){super(0,$,J,Q,Z,Y,V,q);this.type="ConeGeometry",this.parameters={radius:$,height:J,radialSegments:Q,heightSegments:Z,openEnded:Y,thetaStart:V,thetaLength:q}}static fromJSON($){return new mX($.radius,$.height,$.radialSegments,$.heightSegments,$.openEnded,$.thetaStart,$.thetaLength)}};cX=class cX extends u9{constructor($=[],J=[],Q=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:$,indices:J,radius:Q,detail:Z};let Y=[],V=[];if(q(Z),F(Q),N(),this.setAttribute("position",new U9(Y,3)),this.setAttribute("normal",new U9(Y.slice(),3)),this.setAttribute("uv",new U9(V,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function q(E){let y=new s,G=new s,f=new s;for(let d=0;d<J.length;d+=3)P(J[d+0],y),P(J[d+1],G),P(J[d+2],f),U(y,G,f,E)}function U(E,y,G,f){let d=f+1,g=[];for(let b=0;b<=d;b++){g[b]=[];let o=E.clone().lerp(G,b/d),_=y.clone().lerp(G,b/d),z=d-b;for(let x=0;x<=z;x++)if(x===0&&b===d)g[b][x]=o;else g[b][x]=o.clone().lerp(_,x/z)}for(let b=0;b<d;b++)for(let o=0;o<2*(d-b)-1;o++){let _=Math.floor(o/2);if(o%2===0)I(g[b][_+1]),I(g[b+1][_]),I(g[b][_]);else I(g[b][_+1]),I(g[b+1][_+1]),I(g[b+1][_])}}function F(E){let y=new s;for(let G=0;G<Y.length;G+=3)y.x=Y[G+0],y.y=Y[G+1],y.z=Y[G+2],y.normalize().multiplyScalar(E),Y[G+0]=y.x,Y[G+1]=y.y,Y[G+2]=y.z}function N(){let E=new s;for(let y=0;y<Y.length;y+=3){E.x=Y[y+0],E.y=Y[y+1],E.z=Y[y+2];let G=A(E)/2/Math.PI+0.5,f=R(E)/Math.PI+0.5;V.push(G,1-f)}C(),L()}function L(){for(let E=0;E<V.length;E+=6){let y=V[E+0],G=V[E+2],f=V[E+4],d=Math.max(y,G,f),g=Math.min(y,G,f);if(d>0.9&&g<0.1){if(y<0.2)V[E+0]+=1;if(G<0.2)V[E+2]+=1;if(f<0.2)V[E+4]+=1}}}function I(E){Y.push(E.x,E.y,E.z)}function P(E,y){let G=E*3;y.x=$[G+0],y.y=$[G+1],y.z=$[G+2]}function C(){let E=new s,y=new s,G=new s,f=new s,d=new O$,g=new O$,b=new O$;for(let o=0,_=0;o<Y.length;o+=9,_+=6){E.set(Y[o+0],Y[o+1],Y[o+2]),y.set(Y[o+3],Y[o+4],Y[o+5]),G.set(Y[o+6],Y[o+7],Y[o+8]),d.set(V[_+0],V[_+1]),g.set(V[_+2],V[_+3]),b.set(V[_+4],V[_+5]),f.copy(E).add(y).add(G).divideScalar(3);let z=A(f);M(d,_+0,E,z),M(g,_+2,y,z),M(b,_+4,G,z)}}function M(E,y,G,f){if(f<0&&E.x===1)V[y]=E.x-1;if(G.x===0&&G.z===0)V[y]=f/2/Math.PI+0.5}function A(E){return Math.atan2(E.z,-E.x)}function R(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new cX($.vertices,$.indices,$.radius,$.details)}};oX=class oX extends cX{constructor($=1,J=0){let Q=(1+Math.sqrt(5))/2,Z=[-1,Q,0,1,Q,0,-1,-Q,0,1,-Q,0,0,-1,Q,0,1,Q,0,-1,-Q,0,1,-Q,Q,0,-1,Q,0,1,-Q,0,-1,-Q,0,1],Y=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(Z,Y,$,J);this.type="IcosahedronGeometry",this.parameters={radius:$,detail:J}}static fromJSON($){return new oX($.radius,$.detail)}};nJ=class nJ extends u9{constructor($=1,J=1,Q=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:$,height:J,widthSegments:Q,heightSegments:Z};let Y=$/2,V=J/2,q=Math.floor(Q),U=Math.floor(Z),F=q+1,N=U+1,L=$/q,I=J/U,P=[],C=[],M=[],A=[];for(let R=0;R<N;R++){let E=R*I-V;for(let y=0;y<F;y++){let G=y*L-Y;C.push(G,-E,0),M.push(0,0,1),A.push(y/q),A.push(1-R/U)}}for(let R=0;R<U;R++)for(let E=0;E<q;E++){let y=E+F*R,G=E+F*(R+1),f=E+1+F*(R+1),d=E+1+F*R;P.push(y,G,d),P.push(G,f,d)}this.setIndex(P),this.setAttribute("position",new U9(C,3)),this.setAttribute("normal",new U9(M,3)),this.setAttribute("uv",new U9(A,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new nJ($.width,$.height,$.widthSegments,$.heightSegments)}};nX=class nX extends u9{constructor($=1,J=32,Q=16,Z=0,Y=Math.PI*2,V=0,q=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:$,widthSegments:J,heightSegments:Q,phiStart:Z,phiLength:Y,thetaStart:V,thetaLength:q},J=Math.max(3,Math.floor(J)),Q=Math.max(2,Math.floor(Q));let U=Math.min(V+q,Math.PI),F=0,N=[],L=new s,I=new s,P=[],C=[],M=[],A=[];for(let R=0;R<=Q;R++){let E=[],y=R/Q,G=0;if(R===0&&V===0)G=0.5/J;else if(R===Q&&U===Math.PI)G=-0.5/J;for(let f=0;f<=J;f++){let d=f/J;L.x=-$*Math.cos(Z+d*Y)*Math.sin(V+y*q),L.y=$*Math.cos(V+y*q),L.z=$*Math.sin(Z+d*Y)*Math.sin(V+y*q),C.push(L.x,L.y,L.z),I.copy(L).normalize(),M.push(I.x,I.y,I.z),A.push(d+G,1-y),E.push(F++)}N.push(E)}for(let R=0;R<Q;R++)for(let E=0;E<J;E++){let y=N[R][E+1],G=N[R][E],f=N[R+1][E],d=N[R+1][E+1];if(R!==0||V>0)P.push(y,G,d);if(R!==Q-1||U<Math.PI)P.push(G,f,d)}this.setIndex(P),this.setAttribute("position",new U9(C,3)),this.setAttribute("normal",new U9(M,3)),this.setAttribute("uv",new U9(A,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new nX($.radius,$.widthSegments,$.heightSegments,$.phiStart,$.phiLength,$.thetaStart,$.thetaLength)}};sX=class sX extends u9{constructor($=1,J=0.4,Q=12,Z=48,Y=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:$,tube:J,radialSegments:Q,tubularSegments:Z,arc:Y},Q=Math.floor(Q),Z=Math.floor(Z);let V=[],q=[],U=[],F=[],N=new s,L=new s,I=new s;for(let P=0;P<=Q;P++)for(let C=0;C<=Z;C++){let M=C/Z*Y,A=P/Q*Math.PI*2;L.x=($+J*Math.cos(A))*Math.cos(M),L.y=($+J*Math.cos(A))*Math.sin(M),L.z=J*Math.sin(A),q.push(L.x,L.y,L.z),N.x=$*Math.cos(M),N.y=$*Math.sin(M),I.subVectors(L,N).normalize(),U.push(I.x,I.y,I.z),F.push(C/Z),F.push(P/Q)}for(let P=1;P<=Q;P++)for(let C=1;C<=Z;C++){let M=(Z+1)*P+C-1,A=(Z+1)*(P-1)+C-1,R=(Z+1)*(P-1)+C,E=(Z+1)*P+C;V.push(M,A,E),V.push(A,R,E)}this.setIndex(V),this.setAttribute("position",new U9(q,3)),this.setAttribute("normal",new U9(U,3)),this.setAttribute("uv",new U9(F,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new sX($.radius,$.tube,$.radialSegments,$.tubularSegments,$.arc)}};iX=class iX extends T7{constructor($){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new G$(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G$(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new O$(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new e7,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.defines={STANDARD:""},this.color.copy($.color),this.roughness=$.roughness,this.metalness=$.metalness,this.map=$.map,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.emissive.copy($.emissive),this.emissiveMap=$.emissiveMap,this.emissiveIntensity=$.emissiveIntensity,this.bumpMap=$.bumpMap,this.bumpScale=$.bumpScale,this.normalMap=$.normalMap,this.normalMapType=$.normalMapType,this.normalScale.copy($.normalScale),this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.roughnessMap=$.roughnessMap,this.metalnessMap=$.metalnessMap,this.alphaMap=$.alphaMap,this.envMap=$.envMap,this.envMapRotation.copy($.envMapRotation),this.envMapIntensity=$.envMapIntensity,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.flatShading=$.flatShading,this.fog=$.fog,this}};GK=class GK extends iX{constructor($){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new O$(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return w$(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(J){this.ior=(1+0.4*J)/(1-0.4*J)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new G$(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new G$(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new G$(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues($)}get anisotropy(){return this._anisotropy}set anisotropy($){if(this._anisotropy>0!==$>0)this.version++;this._anisotropy=$}get clearcoat(){return this._clearcoat}set clearcoat($){if(this._clearcoat>0!==$>0)this.version++;this._clearcoat=$}get iridescence(){return this._iridescence}set iridescence($){if(this._iridescence>0!==$>0)this.version++;this._iridescence=$}get dispersion(){return this._dispersion}set dispersion($){if(this._dispersion>0!==$>0)this.version++;this._dispersion=$}get sheen(){return this._sheen}set sheen($){if(this._sheen>0!==$>0)this.version++;this._sheen=$}get transmission(){return this._transmission}set transmission($){if(this._transmission>0!==$>0)this.version++;this._transmission=$}copy($){return super.copy($),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=$.anisotropy,this.anisotropyRotation=$.anisotropyRotation,this.anisotropyMap=$.anisotropyMap,this.clearcoat=$.clearcoat,this.clearcoatMap=$.clearcoatMap,this.clearcoatRoughness=$.clearcoatRoughness,this.clearcoatRoughnessMap=$.clearcoatRoughnessMap,this.clearcoatNormalMap=$.clearcoatNormalMap,this.clearcoatNormalScale.copy($.clearcoatNormalScale),this.dispersion=$.dispersion,this.ior=$.ior,this.iridescence=$.iridescence,this.iridescenceMap=$.iridescenceMap,this.iridescenceIOR=$.iridescenceIOR,this.iridescenceThicknessRange=[...$.iridescenceThicknessRange],this.iridescenceThicknessMap=$.iridescenceThicknessMap,this.sheen=$.sheen,this.sheenColor.copy($.sheenColor),this.sheenColorMap=$.sheenColorMap,this.sheenRoughness=$.sheenRoughness,this.sheenRoughnessMap=$.sheenRoughnessMap,this.transmission=$.transmission,this.transmissionMap=$.transmissionMap,this.thickness=$.thickness,this.thicknessMap=$.thicknessMap,this.attenuationDistance=$.attenuationDistance,this.attenuationColor.copy($.attenuationColor),this.specularIntensity=$.specularIntensity,this.specularIntensityMap=$.specularIntensityMap,this.specularColor.copy($.specularColor),this.specularColorMap=$.specularColorMap,this}};EK=class EK extends T7{constructor($){super();this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new G$(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G$(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new O$(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.gradientMap=$.gradientMap,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.emissive.copy($.emissive),this.emissiveMap=$.emissiveMap,this.emissiveIntensity=$.emissiveIntensity,this.bumpMap=$.bumpMap,this.bumpScale=$.bumpScale,this.normalMap=$.normalMap,this.normalMapType=$.normalMapType,this.normalScale.copy($.normalScale),this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.alphaMap=$.alphaMap,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.fog=$.fog,this}};RK=class RK extends T7{constructor($){super();this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new G$(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G$(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new O$(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new e7,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.emissive.copy($.emissive),this.emissiveMap=$.emissiveMap,this.emissiveIntensity=$.emissiveIntensity,this.bumpMap=$.bumpMap,this.bumpScale=$.bumpScale,this.normalMap=$.normalMap,this.normalMapType=$.normalMapType,this.normalScale.copy($.normalScale),this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.specularMap=$.specularMap,this.alphaMap=$.alphaMap,this.envMap=$.envMap,this.envMapRotation.copy($.envMapRotation),this.combine=$.combine,this.reflectivity=$.reflectivity,this.refractionRatio=$.refractionRatio,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.flatShading=$.flatShading,this.fog=$.fog,this}};jK=class jK extends T7{constructor($){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues($)}copy($){return super.copy($),this.depthPacking=$.depthPacking,this.map=$.map,this.alphaMap=$.alphaMap,this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this}};CK=class CK extends T7{constructor($){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues($)}copy($){return super.copy($),this.map=$.map,this.alphaMap=$.alphaMap,this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this}};vK=class vK extends x6{constructor($,J,Q,Z){super($,J,Q,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_($,J,Q){let Z=this.parameterPositions,Y=$-2,V=$+1,q=Z[Y],U=Z[V];if(q===void 0)switch(this.getSettings_().endingStart){case 2401:Y=$,q=2*J-Q;break;case 2402:Y=Z.length-2,q=J+Z[Y]-Z[Y+1];break;default:Y=$,q=Q}if(U===void 0)switch(this.getSettings_().endingEnd){case 2401:V=$,U=2*Q-J;break;case 2402:V=1,U=Q+Z[1]-Z[0];break;default:V=$-1,U=J}let F=(Q-J)*0.5,N=this.valueSize;this._weightPrev=F/(J-q),this._weightNext=F/(U-Q),this._offsetPrev=Y*N,this._offsetNext=V*N}interpolate_($,J,Q,Z){let Y=this.resultBuffer,V=this.sampleValues,q=this.valueSize,U=$*q,F=U-q,N=this._offsetPrev,L=this._offsetNext,I=this._weightPrev,P=this._weightNext,C=(Q-J)/(Z-J),M=C*C,A=M*C,R=-I*A+2*I*M-I*C,E=(1+I)*A+(-1.5-2*I)*M+(-0.5+I)*C+1,y=(-1-P)*A+(1.5+P)*M+0.5*C,G=P*A-P*M;for(let f=0;f!==q;++f)Y[f]=R*V[N+f]+E*V[F+f]+y*V[U+f]+G*V[L+f];return Y}};AK=class AK extends x6{constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($,J,Q,Z){let Y=this.resultBuffer,V=this.sampleValues,q=this.valueSize,U=$*q,F=U-q,N=(Q-J)/(Z-J),L=1-N;for(let I=0;I!==q;++I)Y[I]=V[F+I]*L+V[U+I]*N;return Y}};TK=class TK extends x6{constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($){return this.copySampleValue_($-1)}};S7.prototype.ValueTypeName="";S7.prototype.TimeBufferType=Float32Array;S7.prototype.ValueBufferType=Float32Array;S7.prototype.DefaultInterpolation=2301;m5=class m5 extends S7{constructor($,J,Q){super($,J,Q)}};m5.prototype.ValueTypeName="bool";m5.prototype.ValueBufferType=Array;m5.prototype.DefaultInterpolation=2300;m5.prototype.InterpolantFactoryMethodLinear=void 0;m5.prototype.InterpolantFactoryMethodSmooth=void 0;aX=class aX extends S7{constructor($,J,Q,Z){super($,J,Q,Z)}};aX.prototype.ValueTypeName="color";f6=class f6 extends S7{constructor($,J,Q,Z){super($,J,Q,Z)}};f6.prototype.ValueTypeName="number";SK=class SK extends x6{constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($,J,Q,Z){let Y=this.resultBuffer,V=this.sampleValues,q=this.valueSize,U=(Q-J)/(Z-J),F=$*q;for(let N=F+q;F!==N;F+=4)N5.slerpFlat(Y,0,V,F-q,V,F,U);return Y}};g6=class g6 extends S7{constructor($,J,Q,Z){super($,J,Q,Z)}InterpolantFactoryMethodLinear($){return new SK(this.times,this.values,this.getValueSize(),$)}};g6.prototype.ValueTypeName="quaternion";g6.prototype.InterpolantFactoryMethodSmooth=void 0;c5=class c5 extends S7{constructor($,J,Q){super($,J,Q)}};c5.prototype.ValueTypeName="string";c5.prototype.ValueBufferType=Array;c5.prototype.DefaultInterpolation=2300;c5.prototype.InterpolantFactoryMethodLinear=void 0;c5.prototype.InterpolantFactoryMethodSmooth=void 0;b6=class b6 extends S7{constructor($,J,Q,Z){super($,J,Q,Z)}};b6.prototype.ValueTypeName="vector";g8={enabled:!1,files:{},add:function($,J){if(this.enabled===!1)return;this.files[$]=J},get:function($){if(this.enabled===!1)return;return this.files[$]},remove:function($){delete this.files[$]},clear:function(){this.files={}}};MF=new zK;O5.DEFAULT_MATERIAL_NAME="__DEFAULT";h8={};wK=class wK extends Error{constructor($,J){super($);this.response=J}};rX=class rX extends O5{constructor($){super($);this.mimeType="",this.responseType="",this._abortController=new AbortController}load($,J,Q,Z){if($===void 0)$="";if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let Y=g8.get(`file:${$}`);if(Y!==void 0)return this.manager.itemStart($),setTimeout(()=>{if(J)J(Y);this.manager.itemEnd($)},0),Y;if(h8[$]!==void 0){h8[$].push({onLoad:J,onProgress:Q,onError:Z});return}h8[$]=[],h8[$].push({onLoad:J,onProgress:Q,onError:Z});let V=new Request($,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),q=this.mimeType,U=this.responseType;fetch(V).then((F)=>{if(F.status===200||F.status===0){if(F.status===0)console.warn("THREE.FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||F.body===void 0||F.body.getReader===void 0)return F;let N=h8[$],L=F.body.getReader(),I=F.headers.get("X-File-Size")||F.headers.get("Content-Length"),P=I?parseInt(I):0,C=P!==0,M=0,A=new ReadableStream({start(R){E();function E(){L.read().then(({done:y,value:G})=>{if(y)R.close();else{M+=G.byteLength;let f=new ProgressEvent("progress",{lengthComputable:C,loaded:M,total:P});for(let d=0,g=N.length;d<g;d++){let b=N[d];if(b.onProgress)b.onProgress(f)}R.enqueue(G),E()}},(y)=>{R.error(y)})}}});return new Response(A)}else throw new wK(`fetch for "${F.url}" responded with ${F.status}: ${F.statusText}`,F)}).then((F)=>{switch(U){case"arraybuffer":return F.arrayBuffer();case"blob":return F.blob();case"document":return F.text().then((N)=>{return new DOMParser().parseFromString(N,q)});case"json":return F.json();default:if(q==="")return F.text();else{let L=/charset="?([^;"\s]*)"?/i.exec(q),I=L&&L[1]?L[1].toLowerCase():void 0,P=new TextDecoder(I);return F.arrayBuffer().then((C)=>P.decode(C))}}}).then((F)=>{g8.add(`file:${$}`,F);let N=h8[$];delete h8[$];for(let L=0,I=N.length;L<I;L++){let P=N[L];if(P.onLoad)P.onLoad(F)}}).catch((F)=>{let N=h8[$];if(N===void 0)throw this.manager.itemError($),F;delete h8[$];for(let L=0,I=N.length;L<I;L++){let P=N[L];if(P.onError)P.onError(F)}this.manager.itemError($)}).finally(()=>{this.manager.itemEnd($)}),this.manager.itemStart($)}setResponseType($){return this.responseType=$,this}setMimeType($){return this.mimeType=$,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};T6=new WeakMap;_K=class _K extends O5{constructor($){super($)}load($,J,Q,Z){if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let Y=this,V=g8.get(`image:${$}`);if(V!==void 0){if(V.complete===!0)Y.manager.itemStart($),setTimeout(function(){if(J)J(V);Y.manager.itemEnd($)},0);else{let L=T6.get(V);if(L===void 0)L=[],T6.set(V,L);L.push({onLoad:J,onError:Z})}return V}let q=lJ("img");function U(){if(N(),J)J(this);let L=T6.get(this)||[];for(let I=0;I<L.length;I++){let P=L[I];if(P.onLoad)P.onLoad(this)}T6.delete(this),Y.manager.itemEnd($)}function F(L){if(N(),Z)Z(L);g8.remove(`image:${$}`);let I=T6.get(this)||[];for(let P=0;P<I.length;P++){let C=I[P];if(C.onError)C.onError(L)}T6.delete(this),Y.manager.itemError($),Y.manager.itemEnd($)}function N(){q.removeEventListener("load",U,!1),q.removeEventListener("error",F,!1)}if(q.addEventListener("load",U,!1),q.addEventListener("error",F,!1),$.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)q.crossOrigin=this.crossOrigin}return g8.add(`image:${$}`,q),Y.manager.itemStart($),q.src=$,q}};yK=class yK extends O5{constructor($){super($)}load($,J,Q,Z){let Y=this,V=new oJ,q=new rX(this.manager);return q.setResponseType("arraybuffer"),q.setRequestHeader(this.requestHeader),q.setPath(this.path),q.setWithCredentials(Y.withCredentials),q.load($,function(U){let F;try{F=Y.parse(U)}catch(N){if(Z!==void 0)Z(N);else{console.error(N);return}}if(F.image!==void 0)V.image=F.image;else if(F.data!==void 0)V.image.width=F.width,V.image.height=F.height,V.image.data=F.data;if(V.wrapS=F.wrapS!==void 0?F.wrapS:1001,V.wrapT=F.wrapT!==void 0?F.wrapT:1001,V.magFilter=F.magFilter!==void 0?F.magFilter:1006,V.minFilter=F.minFilter!==void 0?F.minFilter:1006,V.anisotropy=F.anisotropy!==void 0?F.anisotropy:1,F.colorSpace!==void 0)V.colorSpace=F.colorSpace;if(F.flipY!==void 0)V.flipY=F.flipY;if(F.format!==void 0)V.format=F.format;if(F.type!==void 0)V.type=F.type;if(F.mipmaps!==void 0)V.mipmaps=F.mipmaps,V.minFilter=1008;if(F.mipmapCount===1)V.minFilter=1006;if(F.generateMipmaps!==void 0)V.generateMipmaps=F.generateMipmaps;if(V.needsUpdate=!0,J)J(V,F)},Q,Z),V}};fK=class fK extends O5{constructor($){super($)}load($,J,Q,Z){let Y=new b9,V=new _K(this.manager);return V.setCrossOrigin(this.crossOrigin),V.setPath(this.path),V.load($,function(q){if(Y.image=q,Y.needsUpdate=!0,J!==void 0)J(Y)},Q,Z),Y}};sJ=class sJ extends N9{constructor($,J=1){super();this.isLight=!0,this.type="Light",this.color=new G$($),this.intensity=J}dispose(){}copy($,J){return super.copy($,J),this.color.copy($.color),this.intensity=$.intensity,this}toJSON($){let J=super.toJSON($);if(J.object.color=this.color.getHex(),J.object.intensity=this.intensity,this.groundColor!==void 0)J.object.groundColor=this.groundColor.getHex();if(this.distance!==void 0)J.object.distance=this.distance;if(this.angle!==void 0)J.object.angle=this.angle;if(this.decay!==void 0)J.object.decay=this.decay;if(this.penumbra!==void 0)J.object.penumbra=this.penumbra;if(this.shadow!==void 0)J.object.shadow=this.shadow.toJSON();if(this.target!==void 0)J.object.target=this.target.uuid;return J}};OX=new _$,SV=new s,kV=new s;bK=class bK extends AZ{constructor(){super(new Q7(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices($){let J=this.camera,Q=_6*2*$.angle*this.focus,Z=this.mapSize.width/this.mapSize.height*this.aspect,Y=$.distance||J.far;if(Q!==J.fov||Z!==J.aspect||Y!==J.far)J.fov=Q,J.aspect=Z,J.far=Y,J.updateProjectionMatrix();super.updateMatrices($)}copy($){return super.copy($),this.focus=$.focus,this}};hK=class hK extends sJ{constructor($,J,Q=0,Z=Math.PI/3,Y=0,V=2){super($,J);this.isSpotLight=!0,this.type="SpotLight",this.position.copy(N9.DEFAULT_UP),this.updateMatrix(),this.target=new N9,this.distance=Q,this.angle=Z,this.penumbra=Y,this.decay=V,this.map=null,this.shadow=new bK}get power(){return this.intensity*Math.PI}set power($){this.intensity=$/Math.PI}dispose(){this.shadow.dispose()}copy($,J){return super.copy($,J),this.distance=$.distance,this.angle=$.angle,this.penumbra=$.penumbra,this.decay=$.decay,this.target=$.target.clone(),this.shadow=$.shadow.clone(),this}};zV=new _$,hJ=new s,LX=new s;xK=class xK extends AZ{constructor(){super(new Q7(90,1,0.5,500));this.isPointLightShadow=!0,this._frameExtents=new O$(4,2),this._viewportCount=6,this._viewports=[new a$(2,1,1,1),new a$(0,1,1,1),new a$(3,1,1,1),new a$(1,1,1,1),new a$(3,0,1,1),new a$(1,0,1,1)],this._cubeDirections=[new s(1,0,0),new s(-1,0,0),new s(0,0,1),new s(0,0,-1),new s(0,1,0),new s(0,-1,0)],this._cubeUps=[new s(0,1,0),new s(0,1,0),new s(0,1,0),new s(0,1,0),new s(0,0,1),new s(0,0,-1)]}updateMatrices($,J=0){let Q=this.camera,Z=this.matrix,Y=$.distance||Q.far;if(Y!==Q.far)Q.far=Y,Q.updateProjectionMatrix();hJ.setFromMatrixPosition($.matrixWorld),Q.position.copy(hJ),LX.copy(Q.position),LX.add(this._cubeDirections[J]),Q.up.copy(this._cubeUps[J]),Q.lookAt(LX),Q.updateMatrixWorld(),Z.makeTranslation(-hJ.x,-hJ.y,-hJ.z),zV.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),this._frustum.setFromProjectionMatrix(zV,Q.coordinateSystem,Q.reversedDepth)}};gK=class gK extends sJ{constructor($,J,Q=0,Z=2){super($,J);this.isPointLight=!0,this.type="PointLight",this.distance=Q,this.decay=Z,this.shadow=new xK}get power(){return this.intensity*4*Math.PI}set power($){this.intensity=$/(4*Math.PI)}dispose(){this.shadow.dispose()}copy($,J){return super.copy($,J),this.distance=$.distance,this.decay=$.decay,this.shadow=$.shadow.clone(),this}};TZ=class TZ extends wX{constructor($=-1,J=1,Q=1,Z=-1,Y=0.1,V=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=$,this.right=J,this.top=Q,this.bottom=Z,this.near=Y,this.far=V,this.updateProjectionMatrix()}copy($,J){return super.copy($,J),this.left=$.left,this.right=$.right,this.top=$.top,this.bottom=$.bottom,this.near=$.near,this.far=$.far,this.zoom=$.zoom,this.view=$.view===null?null:Object.assign({},$.view),this}setViewOffset($,J,Q,Z,Y,V){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=$,this.view.fullHeight=J,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=Y,this.view.height=V,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let $=(this.right-this.left)/(2*this.zoom),J=(this.top-this.bottom)/(2*this.zoom),Q=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,Y=Q-$,V=Q+$,q=Z+J,U=Z-J;if(this.view!==null&&this.view.enabled){let F=(this.right-this.left)/this.view.fullWidth/this.zoom,N=(this.top-this.bottom)/this.view.fullHeight/this.zoom;Y+=F*this.view.offsetX,V=Y+F*this.view.width,q-=N*this.view.offsetY,U=q-N*this.view.height}this.projectionMatrix.makeOrthographic(Y,V,q,U,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON($){let J=super.toJSON($);if(J.object.zoom=this.zoom,J.object.left=this.left,J.object.right=this.right,J.object.top=this.top,J.object.bottom=this.bottom,J.object.near=this.near,J.object.far=this.far,this.view!==null)J.object.view=Object.assign({},this.view);return J}};uK=class uK extends AZ{constructor(){super(new TZ(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}};pK=class pK extends sJ{constructor($,J){super($,J);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(N9.DEFAULT_UP),this.updateMatrix(),this.target=new N9,this.shadow=new uK}dispose(){this.shadow.dispose()}copy($){return super.copy($),this.target=$.target.clone(),this.shadow=$.shadow.clone(),this}};lK=class lK extends sJ{constructor($,J){super($,J);this.isAmbientLight=!0,this.type="AmbientLight"}};mK=class mK extends u9{constructor(){super();this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy($){return super.copy($),this.instanceCount=$.instanceCount,this}toJSON(){let $=super.toJSON();return $.instanceCount=this.instanceCount,$.isInstancedBufferGeometry=!0,$}};IX=new WeakMap;cK=class cK extends O5{constructor($){super($);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")console.warn("THREE.ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions($){return this.options=$,this}load($,J,Q,Z){if($===void 0)$="";if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let Y=this,V=g8.get(`image-bitmap:${$}`);if(V!==void 0){if(Y.manager.itemStart($),V.then){V.then((F)=>{if(IX.has(V)===!0){if(Z)Z(IX.get(V));Y.manager.itemError($),Y.manager.itemEnd($)}else{if(J)J(F);return Y.manager.itemEnd($),F}});return}return setTimeout(function(){if(J)J(V);Y.manager.itemEnd($)},0),V}let q={};q.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",q.headers=this.requestHeader,q.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let U=fetch($,q).then(function(F){return F.blob()}).then(function(F){return createImageBitmap(F,Object.assign(Y.options,{colorSpaceConversion:"none"}))}).then(function(F){if(g8.add(`image-bitmap:${$}`,F),J)J(F);return Y.manager.itemEnd($),F}).catch(function(F){if(Z)Z(F);IX.set(U,F),g8.remove(`image-bitmap:${$}`),Y.manager.itemError($),Y.manager.itemEnd($)});g8.add(`image-bitmap:${$}`,U),Y.manager.itemStart($)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};oK=class oK extends Q7{constructor($=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=$}};vF=new RegExp("["+tX+"]","g"),eX="[^"+tX+"]",AF="[^"+tX.replace("\\.","")+"]",TF=/((?:WC+[\/:])*)/.source.replace("WC",eX),SF=/(WCOD+)?/.source.replace("WCOD",AF),kF=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",eX),zF=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",eX),wF=new RegExp("^"+TF+SF+kF+zF+"$"),_F=["material","materials","bones","map"];J9.Composite=nK;J9.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};J9.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};J9.prototype.GetterByBindingType=[J9.prototype._getValue_direct,J9.prototype._getValue_array,J9.prototype._getValue_arrayElement,J9.prototype._getValue_toArray];J9.prototype.SetterByBindingTypeAndVersioning=[[J9.prototype._setValue_direct,J9.prototype._setValue_direct_setNeedsUpdate,J9.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[J9.prototype._setValue_array,J9.prototype._setValue_array_setNeedsUpdate,J9.prototype._setValue_array_setMatrixWorldNeedsUpdate],[J9.prototype._setValue_arrayElement,J9.prototype._setValue_arrayElement_setNeedsUpdate,J9.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[J9.prototype._setValue_fromArray,J9.prototype._setValue_fromArray_setNeedsUpdate,J9.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];RL=new Float32Array(1);if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));if(typeof window<"u")if(window.__THREE__)console.warn("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="180";T$={alphahash_fragment:bF,alphahash_pars_fragment:hF,alphamap_fragment:xF,alphamap_pars_fragment:gF,alphatest_fragment:uF,alphatest_pars_fragment:pF,aomap_fragment:lF,aomap_pars_fragment:dF,batching_pars_vertex:mF,batching_vertex:cF,begin_vertex:oF,beginnormal_vertex:nF,bsdfs:sF,iridescence_fragment:iF,bumpmap_pars_fragment:aF,clipping_planes_fragment:rF,clipping_planes_pars_fragment:tF,clipping_planes_pars_vertex:eF,clipping_planes_vertex:$B,color_fragment:JB,color_pars_fragment:QB,color_pars_vertex:ZB,color_vertex:XB,common:WB,cube_uv_reflection_fragment:YB,defaultnormal_vertex:VB,displacementmap_pars_vertex:KB,displacementmap_vertex:UB,emissivemap_fragment:qB,emissivemap_pars_fragment:HB,colorspace_fragment:FB,colorspace_pars_fragment:BB,envmap_fragment:NB,envmap_common_pars_fragment:OB,envmap_pars_fragment:LB,envmap_pars_vertex:IB,envmap_physical_pars_fragment:TB,envmap_vertex:DB,fog_vertex:PB,fog_pars_vertex:GB,fog_fragment:EB,fog_pars_fragment:RB,gradientmap_pars_fragment:jB,lightmap_pars_fragment:CB,lights_lambert_fragment:MB,lights_lambert_pars_fragment:vB,lights_pars_begin:AB,lights_toon_fragment:SB,lights_toon_pars_fragment:kB,lights_phong_fragment:zB,lights_phong_pars_fragment:wB,lights_physical_fragment:_B,lights_physical_pars_fragment:yB,lights_fragment_begin:fB,lights_fragment_maps:bB,lights_fragment_end:hB,logdepthbuf_fragment:xB,logdepthbuf_pars_fragment:gB,logdepthbuf_pars_vertex:uB,logdepthbuf_vertex:pB,map_fragment:lB,map_pars_fragment:dB,map_particle_fragment:mB,map_particle_pars_fragment:cB,metalnessmap_fragment:oB,metalnessmap_pars_fragment:nB,morphinstance_vertex:sB,morphcolor_vertex:iB,morphnormal_vertex:aB,morphtarget_pars_vertex:rB,morphtarget_vertex:tB,normal_fragment_begin:eB,normal_fragment_maps:$N,normal_pars_fragment:JN,normal_pars_vertex:QN,normal_vertex:ZN,normalmap_pars_fragment:XN,clearcoat_normal_fragment_begin:WN,clearcoat_normal_fragment_maps:YN,clearcoat_pars_fragment:VN,iridescence_pars_fragment:KN,opaque_fragment:UN,packing:qN,premultiplied_alpha_fragment:HN,project_vertex:FN,dithering_fragment:BN,dithering_pars_fragment:NN,roughnessmap_fragment:ON,roughnessmap_pars_fragment:LN,shadowmap_pars_fragment:IN,shadowmap_pars_vertex:DN,shadowmap_vertex:PN,shadowmask_pars_fragment:GN,skinbase_vertex:EN,skinning_pars_vertex:RN,skinning_vertex:jN,skinnormal_vertex:CN,specularmap_fragment:MN,specularmap_pars_fragment:vN,tonemapping_fragment:AN,tonemapping_pars_fragment:TN,transmission_fragment:SN,transmission_pars_fragment:kN,uv_pars_fragment:zN,uv_pars_vertex:wN,uv_vertex:_N,worldpos_vertex:yN,background_vert:fN,background_frag:bN,backgroundCube_vert:hN,backgroundCube_frag:xN,cube_vert:gN,cube_frag:uN,depth_vert:pN,depth_frag:lN,distanceRGBA_vert:dN,distanceRGBA_frag:mN,equirect_vert:cN,equirect_frag:oN,linedashed_vert:nN,linedashed_frag:sN,meshbasic_vert:iN,meshbasic_frag:aN,meshlambert_vert:rN,meshlambert_frag:tN,meshmatcap_vert:eN,meshmatcap_frag:$3,meshnormal_vert:J3,meshnormal_frag:Q3,meshphong_vert:Z3,meshphong_frag:X3,meshphysical_vert:W3,meshphysical_frag:Y3,meshtoon_vert:V3,meshtoon_frag:K3,points_vert:U3,points_frag:q3,shadow_vert:H3,shadow_frag:F3,sprite_vert:B3,sprite_frag:N3},b0={common:{diffuse:{value:new G$(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new A$},alphaMap:{value:null},alphaMapTransform:{value:new A$},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new A$}},envmap:{envMap:{value:null},envMapRotation:{value:new A$},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new A$}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new A$}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new A$},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new A$},normalScale:{value:new O$(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new A$},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new A$}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new A$}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new A$}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new G$(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new G$(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new A$},alphaTest:{value:0},uvTransform:{value:new A$}},sprite:{diffuse:{value:new G$(16777215)},opacity:{value:1},center:{value:new O$(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new A$},alphaMap:{value:null},alphaMapTransform:{value:new A$},alphaTest:{value:0}}},B8={basic:{uniforms:J7([b0.common,b0.specularmap,b0.envmap,b0.aomap,b0.lightmap,b0.fog]),vertexShader:T$.meshbasic_vert,fragmentShader:T$.meshbasic_frag},lambert:{uniforms:J7([b0.common,b0.specularmap,b0.envmap,b0.aomap,b0.lightmap,b0.emissivemap,b0.bumpmap,b0.normalmap,b0.displacementmap,b0.fog,b0.lights,{emissive:{value:new G$(0)}}]),vertexShader:T$.meshlambert_vert,fragmentShader:T$.meshlambert_frag},phong:{uniforms:J7([b0.common,b0.specularmap,b0.envmap,b0.aomap,b0.lightmap,b0.emissivemap,b0.bumpmap,b0.normalmap,b0.displacementmap,b0.fog,b0.lights,{emissive:{value:new G$(0)},specular:{value:new G$(1118481)},shininess:{value:30}}]),vertexShader:T$.meshphong_vert,fragmentShader:T$.meshphong_frag},standard:{uniforms:J7([b0.common,b0.envmap,b0.aomap,b0.lightmap,b0.emissivemap,b0.bumpmap,b0.normalmap,b0.displacementmap,b0.roughnessmap,b0.metalnessmap,b0.fog,b0.lights,{emissive:{value:new G$(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:T$.meshphysical_vert,fragmentShader:T$.meshphysical_frag},toon:{uniforms:J7([b0.common,b0.aomap,b0.lightmap,b0.emissivemap,b0.bumpmap,b0.normalmap,b0.displacementmap,b0.gradientmap,b0.fog,b0.lights,{emissive:{value:new G$(0)}}]),vertexShader:T$.meshtoon_vert,fragmentShader:T$.meshtoon_frag},matcap:{uniforms:J7([b0.common,b0.bumpmap,b0.normalmap,b0.displacementmap,b0.fog,{matcap:{value:null}}]),vertexShader:T$.meshmatcap_vert,fragmentShader:T$.meshmatcap_frag},points:{uniforms:J7([b0.points,b0.fog]),vertexShader:T$.points_vert,fragmentShader:T$.points_frag},dashed:{uniforms:J7([b0.common,b0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:T$.linedashed_vert,fragmentShader:T$.linedashed_frag},depth:{uniforms:J7([b0.common,b0.displacementmap]),vertexShader:T$.depth_vert,fragmentShader:T$.depth_frag},normal:{uniforms:J7([b0.common,b0.bumpmap,b0.normalmap,b0.displacementmap,{opacity:{value:1}}]),vertexShader:T$.meshnormal_vert,fragmentShader:T$.meshnormal_frag},sprite:{uniforms:J7([b0.sprite,b0.fog]),vertexShader:T$.sprite_vert,fragmentShader:T$.sprite_frag},background:{uniforms:{uvTransform:{value:new A$},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:T$.background_vert,fragmentShader:T$.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new A$}},vertexShader:T$.backgroundCube_vert,fragmentShader:T$.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:T$.cube_vert,fragmentShader:T$.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:T$.equirect_vert,fragmentShader:T$.equirect_frag},distanceRGBA:{uniforms:J7([b0.common,b0.displacementmap,{referencePosition:{value:new s},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:T$.distanceRGBA_vert,fragmentShader:T$.distanceRGBA_frag},shadow:{uniforms:J7([b0.lights,b0.fog,{color:{value:new G$(0)},opacity:{value:1}}]),vertexShader:T$.shadow_vert,fragmentShader:T$.shadow_frag}};B8.physical={uniforms:J7([B8.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new A$},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new A$},clearcoatNormalScale:{value:new O$(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new A$},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new A$},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new A$},sheen:{value:0},sheenColor:{value:new G$(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new A$},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new A$},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new A$},transmissionSamplerSize:{value:new O$},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new A$},attenuationDistance:{value:0},attenuationColor:{value:new G$(0)},specularColor:{value:new G$(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new A$},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new A$},anisotropyVector:{value:new O$},anisotropyMap:{value:null},anisotropyMapTransform:{value:new A$}}]),vertexShader:T$.meshphysical_vert,fragmentShader:T$.meshphysical_frag};OZ={r:0,b:0,g:0},g5=new e7,O3=new _$;_V=[0.125,0.215,0.35,0.446,0.526,0.582],DX=new TZ,yV=new G$,p5=(1+Math.sqrt(5))/2,S6=1/p5,fV=[new s(-p5,S6,0),new s(p5,S6,0),new s(-S6,0,p5),new s(S6,0,p5),new s(0,p5,-S6),new s(0,p5,S6),new s(-1,1,-1),new s(1,1,-1),new s(-1,1,1),new s(1,1,1)],R3=new s;iK=new b9,gV=new pX(1,1),aK=new TX,rK=new WK,tK=new _X,uV=[],pV=[],lV=new Float32Array(16),dV=new Float32Array(9),mV=new Float32Array(4);jX=/(\w+)(\])?(\[|\.)?/g;nV=new A$;IZ=new s;SO=/^[ \t]*#include +<([\w\d./]+)>/gm;kO=new Map;wO=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;$L={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};WU=class WU extends d5{constructor($,J){super();let Q=this,Z=null,Y=1,V=null,q="local-floor",U=1,F=null,N=null,L=null,I=null,P=null,C=null,M=typeof XRWebGLBinding<"u",A=new XU,R={},E=J.getContextAttributes(),y=null,G=null,f=[],d=[],g=new O$,b=null,o=new Q7;o.viewport=new a$;let _=new Q7;_.viewport=new a$;let z=[o,_],x=new oK,r=null,e=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(B0){let w0=f[B0];if(w0===void 0)w0=new DZ,f[B0]=w0;return w0.getTargetRaySpace()},this.getControllerGrip=function(B0){let w0=f[B0];if(w0===void 0)w0=new DZ,f[B0]=w0;return w0.getGripSpace()},this.getHand=function(B0){let w0=f[B0];if(w0===void 0)w0=new DZ,f[B0]=w0;return w0.getHandSpace()};function Q0(B0){let w0=d.indexOf(B0.inputSource);if(w0===-1)return;let D0=f[w0];if(D0!==void 0)D0.update(B0.inputSource,B0.frame,F||V),D0.dispatchEvent({type:B0.type,data:B0.inputSource})}function J0(){Z.removeEventListener("select",Q0),Z.removeEventListener("selectstart",Q0),Z.removeEventListener("selectend",Q0),Z.removeEventListener("squeeze",Q0),Z.removeEventListener("squeezestart",Q0),Z.removeEventListener("squeezeend",Q0),Z.removeEventListener("end",J0),Z.removeEventListener("inputsourceschange",K0);for(let B0=0;B0<f.length;B0++){let w0=d[B0];if(w0===null)continue;d[B0]=null,f[B0].disconnect(w0)}r=null,e=null,A.reset();for(let B0 in R)delete R[B0];$.setRenderTarget(y),P=null,I=null,L=null,Z=null,G=null,M$.stop(),Q.isPresenting=!1,$.setPixelRatio(b),$.setSize(g.width,g.height,!1),Q.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(B0){if(Y=B0,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(B0){if(q=B0,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return F||V},this.setReferenceSpace=function(B0){F=B0},this.getBaseLayer=function(){return I!==null?I:P},this.getBinding=function(){if(L===null&&M)L=new XRWebGLBinding(Z,J);return L},this.getFrame=function(){return C},this.getSession=function(){return Z},this.setSession=async function(B0){if(Z=B0,Z!==null){if(y=$.getRenderTarget(),Z.addEventListener("select",Q0),Z.addEventListener("selectstart",Q0),Z.addEventListener("selectend",Q0),Z.addEventListener("squeeze",Q0),Z.addEventListener("squeezestart",Q0),Z.addEventListener("squeezeend",Q0),Z.addEventListener("end",J0),Z.addEventListener("inputsourceschange",K0),E.xrCompatible!==!0)await J.makeXRCompatible();if(b=$.getPixelRatio(),$.getSize(g),!(M&&("createProjectionLayer"in XRWebGLBinding.prototype))){let D0={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:Y};P=new XRWebGLLayer(Z,J,D0),Z.updateRenderState({baseLayer:P}),$.setPixelRatio(1),$.setSize(P.framebufferWidth,P.framebufferHeight,!1),G=new p8(P.framebufferWidth,P.framebufferHeight,{format:1023,type:1009,colorSpace:$.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:P.ignoreDepthValues===!1,resolveStencilBuffer:P.ignoreDepthValues===!1})}else{let D0=null,t0=null,N$=null;if(E.depth)N$=E.stencil?J.DEPTH24_STENCIL8:J.DEPTH_COMPONENT24,D0=E.stencil?1027:1026,t0=E.stencil?1020:1014;let X$={colorFormat:J.RGBA8,depthFormat:N$,scaleFactor:Y};L=this.getBinding(),I=L.createProjectionLayer(X$),Z.updateRenderState({layers:[I]}),$.setPixelRatio(1),$.setSize(I.textureWidth,I.textureHeight,!1),G=new p8(I.textureWidth,I.textureHeight,{format:1023,type:1009,depthTexture:new pX(I.textureWidth,I.textureHeight,t0,void 0,void 0,void 0,void 0,void 0,void 0,D0),stencilBuffer:E.stencil,colorSpace:$.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:I.ignoreDepthValues===!1,resolveStencilBuffer:I.ignoreDepthValues===!1})}G.isXRRenderTarget=!0,this.setFoveation(U),F=null,V=await Z.requestReferenceSpace(q),M$.setContext(Z),M$.start(),Q.isPresenting=!0,Q.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return A.getDepthTexture()};function K0(B0){for(let w0=0;w0<B0.removed.length;w0++){let D0=B0.removed[w0],t0=d.indexOf(D0);if(t0>=0)d[t0]=null,f[t0].disconnect(D0)}for(let w0=0;w0<B0.added.length;w0++){let D0=B0.added[w0],t0=d.indexOf(D0);if(t0===-1){for(let X$=0;X$<f.length;X$++)if(X$>=d.length){d.push(D0),t0=X$;break}else if(d[X$]===null){d[X$]=D0,t0=X$;break}if(t0===-1)break}let N$=f[t0];if(N$)N$.connect(D0)}}let F0=new s,U0=new s;function C0(B0,w0,D0){F0.setFromMatrixPosition(w0.matrixWorld),U0.setFromMatrixPosition(D0.matrixWorld);let t0=F0.distanceTo(U0),N$=w0.projectionMatrix.elements,X$=D0.projectionMatrix.elements,I9=N$[14]/(N$[10]-1),l=N$[14]/(N$[10]+1),f$=(N$[9]+1)/N$[5],L$=(N$[9]-1)/N$[5],q$=(N$[8]-1)/N$[0],i0=(X$[8]+1)/X$[0],b$=I9*q$,o0=I9*i0,W$=t0/(-q$+i0),F9=W$*-q$;if(w0.matrixWorld.decompose(B0.position,B0.quaternion,B0.scale),B0.translateX(F9),B0.translateZ(W$),B0.matrixWorld.compose(B0.position,B0.quaternion,B0.scale),B0.matrixWorldInverse.copy(B0.matrixWorld).invert(),N$[10]===-1)B0.projectionMatrix.copy(w0.projectionMatrix),B0.projectionMatrixInverse.copy(w0.projectionMatrixInverse);else{let s0=I9+W$,G0=l+W$,u=b$-F9,T=o0+(t0-F9),i=f$*l/G0*s0,V0=L$*l/G0*s0;B0.projectionMatrix.makePerspective(u,T,i,V0,s0,G0),B0.projectionMatrixInverse.copy(B0.projectionMatrix).invert()}}function x0(B0,w0){if(w0===null)B0.matrixWorld.copy(B0.matrix);else B0.matrixWorld.multiplyMatrices(w0.matrixWorld,B0.matrix);B0.matrixWorldInverse.copy(B0.matrixWorld).invert()}this.updateCamera=function(B0){if(Z===null)return;let{near:w0,far:D0}=B0;if(A.texture!==null){if(A.depthNear>0)w0=A.depthNear;if(A.depthFar>0)D0=A.depthFar}if(x.near=_.near=o.near=w0,x.far=_.far=o.far=D0,r!==x.near||e!==x.far)Z.updateRenderState({depthNear:x.near,depthFar:x.far}),r=x.near,e=x.far;x.layers.mask=B0.layers.mask|6,o.layers.mask=x.layers.mask&3,_.layers.mask=x.layers.mask&5;let t0=B0.parent,N$=x.cameras;x0(x,t0);for(let X$=0;X$<N$.length;X$++)x0(N$[X$],t0);if(N$.length===2)C0(x,o,_);else x.projectionMatrix.copy(o.projectionMatrix);e0(B0,x,t0)};function e0(B0,w0,D0){if(D0===null)B0.matrix.copy(w0.matrixWorld);else B0.matrix.copy(D0.matrixWorld),B0.matrix.invert(),B0.matrix.multiply(w0.matrixWorld);if(B0.matrix.decompose(B0.position,B0.quaternion,B0.scale),B0.updateMatrixWorld(!0),B0.projectionMatrix.copy(w0.projectionMatrix),B0.projectionMatrixInverse.copy(w0.projectionMatrixInverse),B0.isPerspectiveCamera)B0.fov=_6*2*Math.atan(1/B0.projectionMatrix.elements[5]),B0.zoom=1}this.getCamera=function(){return x},this.getFoveation=function(){if(I===null&&P===null)return;return U},this.setFoveation=function(B0){if(U=B0,I!==null)I.fixedFoveation=B0;if(P!==null&&P.fixedFoveation!==void 0)P.fixedFoveation=B0},this.hasDepthSensing=function(){return A.texture!==null},this.getDepthSensingMesh=function(){return A.getMesh(x)},this.getCameraTexture=function(B0){return R[B0]};let p0=null;function z$(B0,w0){if(N=w0.getViewerPose(F||V),C=w0,N!==null){let D0=N.views;if(P!==null)$.setRenderTargetFramebuffer(G,P.framebuffer),$.setRenderTarget(G);let t0=!1;if(D0.length!==x.cameras.length)x.cameras.length=0,t0=!0;for(let l=0;l<D0.length;l++){let f$=D0[l],L$=null;if(P!==null)L$=P.getViewport(f$);else{let i0=L.getViewSubImage(I,f$);if(L$=i0.viewport,l===0)$.setRenderTargetTextures(G,i0.colorTexture,i0.depthStencilTexture),$.setRenderTarget(G)}let q$=z[l];if(q$===void 0)q$=new Q7,q$.layers.enable(l),q$.viewport=new a$,z[l]=q$;if(q$.matrix.fromArray(f$.transform.matrix),q$.matrix.decompose(q$.position,q$.quaternion,q$.scale),q$.projectionMatrix.fromArray(f$.projectionMatrix),q$.projectionMatrixInverse.copy(q$.projectionMatrix).invert(),q$.viewport.set(L$.x,L$.y,L$.width,L$.height),l===0)x.matrix.copy(q$.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale);if(t0===!0)x.cameras.push(q$)}let N$=Z.enabledFeatures;if(N$&&N$.includes("depth-sensing")&&Z.depthUsage=="gpu-optimized"&&M){L=Q.getBinding();let l=L.getDepthInformation(D0[0]);if(l&&l.isValid&&l.texture)A.init(l,Z.renderState)}if(N$&&N$.includes("camera-access")&&M){$.state.unbindTexture(),L=Q.getBinding();for(let l=0;l<D0.length;l++){let f$=D0[l].camera;if(f$){let L$=R[f$];if(!L$)L$=new lX,R[f$]=L$;let q$=L.getCameraImage(f$);L$.sourceTexture=q$}}}}for(let D0=0;D0<f.length;D0++){let t0=d[D0],N$=f[D0];if(t0!==null&&N$!==void 0)N$.update(t0,w0,F||V)}if(p0)p0(B0,w0);if(w0.detectedPlanes)Q.dispatchEvent({type:"planesdetected",data:w0});C=null}let M$=new sK;M$.setAnimationLoop(z$),this.setAnimationLoop=function(B0){p0=B0},this.dispose=function(){}}};u5=new e7,YL=new _$;JW=lK,QW=kK,ZW=hX,l6=O8,X9=h6,z9=K7,p9=u9,l8=PK,kZ=dX,y$=G$,zZ=o$,d8=mX,Q9=vZ,o5=oJ,XW=yK,m6=VK,iJ=pK,wZ=rX,n5=U9,_Z=yX,t$=k6,YW=oX,VW=cK,L5=PZ,yZ=mK,r$=OK,fZ=fX,bZ=mJ,KW=x6,qW=MZ,o6=gX,HW=IK,n6=LK,BW=O5,s5=dK,rJ=T7,NW=m2,L8=_$,T0=V7,Y9=jZ,gZ=RK,k7=GK,s6=iX,uZ=EK,lZ=f6,o8=N9,tJ=TZ,eJ=Q7,L7=nJ,$Q=gK,z7=DK,w7=uX,DW=J9,i5=N5,mZ=g6,cZ=HK,n8=N8,PW=xX,GW=NK,EW=$8,D5=nX,RW=hK,a6=BK,r6=bX,t6=b9,jW=fK,oZ=sX,P5=O$,M9=s,nZ=b6,sZ=p8,MW=YU});var KU={};nY(KU,{HDRLoader:()=>VU});var VU;var UU=pQ(()=>{ZQ();VU=class VU extends XW{constructor($){super($);this.type=c8}parse($){let V=function(b,o){switch(b){case 1:throw Error("THREE.HDRLoader: Read Error: "+(o||""));case 2:throw Error("THREE.HDRLoader: Write Error: "+(o||""));case 3:throw Error("THREE.HDRLoader: Bad File Format: "+(o||""));default:case 4:throw Error("THREE.HDRLoader: Memory Error: "+(o||""))}},L=function(b,o,_){o=!o?1024:o;let x=b.pos,r=-1,e=0,Q0="",J0=String.fromCharCode.apply(null,new Uint16Array(b.subarray(x,x+128)));while(0>(r=J0.indexOf(`
`))&&e<o&&x<b.byteLength)Q0+=J0,e+=J0.length,x+=128,J0+=String.fromCharCode.apply(null,new Uint16Array(b.subarray(x,x+128)));if(-1<r){if(_!==!1)b.pos+=e+r+1;return Q0+J0.slice(0,r)}return!1},I=function(b){let o=/^#\?(\S+)/,_=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,z=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,x=/^\s*FORMAT=(\S+)\s*$/,r=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,e={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},Q0,J0;if(b.pos>=b.byteLength||!(Q0=L(b)))V(1,"no header found");if(!(J0=Q0.match(o)))V(3,"bad initial token");e.valid|=1,e.programtype=J0[1],e.string+=Q0+`
`;while(!0){if(Q0=L(b),Q0===!1)break;if(e.string+=Q0+`
`,Q0.charAt(0)==="#"){e.comments+=Q0+`
`;continue}if(J0=Q0.match(_))e.gamma=parseFloat(J0[1]);if(J0=Q0.match(z))e.exposure=parseFloat(J0[1]);if(J0=Q0.match(x))e.valid|=2,e.format=J0[1];if(J0=Q0.match(r))e.valid|=4,e.height=parseInt(J0[1],10),e.width=parseInt(J0[2],10);if(e.valid&2&&e.valid&4)break}if(!(e.valid&2))V(3,"missing format specifier");if(!(e.valid&4))V(3,"missing image size specifier");return e},P=function(b,o,_){let z=o;if(z<8||z>32767||(b[0]!==2||b[1]!==2||b[2]&128))return new Uint8Array(b);if(z!==(b[2]<<8|b[3]))V(3,"wrong scanline width");let x=new Uint8Array(4*o*_);if(!x.length)V(4,"unable to allocate buffer space");let r=0,e=0,Q0=4*z,J0=new Uint8Array(4),K0=new Uint8Array(Q0),F0=_;while(F0>0&&e<b.byteLength){if(e+4>b.byteLength)V(1);if(J0[0]=b[e++],J0[1]=b[e++],J0[2]=b[e++],J0[3]=b[e++],J0[0]!=2||J0[1]!=2||(J0[2]<<8|J0[3])!=z)V(3,"bad rgbe scanline format");let U0=0,C0;while(U0<Q0&&e<b.byteLength){C0=b[e++];let e0=C0>128;if(e0)C0-=128;if(C0===0||U0+C0>Q0)V(3,"bad scanline data");if(e0){let p0=b[e++];for(let z$=0;z$<C0;z$++)K0[U0++]=p0}else K0.set(b.subarray(e,e+C0),U0),U0+=C0,e+=C0}let x0=z;for(let e0=0;e0<x0;e0++){let p0=0;x[r]=K0[e0+p0],p0+=z,x[r+1]=K0[e0+p0],p0+=z,x[r+2]=K0[e0+p0],p0+=z,x[r+3]=K0[e0+p0],r+=4}F0--}return x},C=function(b,o,_,z){let x=b[o+3],r=Math.pow(2,x-128)/255;_[z+0]=b[o+0]*r,_[z+1]=b[o+1]*r,_[z+2]=b[o+2]*r,_[z+3]=1},M=function(b,o,_,z){let x=b[o+3],r=Math.pow(2,x-128)/255;_[z+0]=m6.toHalfFloat(Math.min(b[o+0]*r,65504)),_[z+1]=m6.toHalfFloat(Math.min(b[o+1]*r,65504)),_[z+2]=m6.toHalfFloat(Math.min(b[o+2]*r,65504)),_[z+3]=m6.toHalfFloat(1)},A=new Uint8Array($);A.pos=0;let R=I(A),E=R.width,y=R.height,G=P(A.subarray(A.pos),E,y),f,d,g;switch(this.type){case aJ:g=G.length/4;let b=new Float32Array(g*4);for(let _=0;_<g;_++)C(G,_*4,b,_*4);f=b,d=aJ;break;case c8:g=G.length/4;let o=new Uint16Array(g*4);for(let _=0;_<g;_++)M(G,_*4,o,_*4);f=o,d=c8;break;default:throw Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:E,height:y,data:f,header:R.string,gamma:R.gamma,exposure:R.exposure,type:d}}setDataType($){return this.type=$,this}load($,J,Q,Z){function Y(V,q){switch(V.type){case aJ:case c8:V.colorSpace=n9,V.minFilter=w9,V.magFilter=w9,V.generateMipmaps=!1,V.flipY=!0;break}if(J)J(V,q)}return super.load($,Y,Q,Z)}}});function vW($,J){if(J===CW)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),$;if(J===e6||J===QQ){let Q=$.getIndex();if(Q===null){let q=[],U=$.getAttribute("position");if(U!==void 0){for(let F=0;F<U.count;F++)q.push(F);$.setIndex(q),Q=$.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),$}let Z=Q.count-2,Y=[];if(J===e6)for(let q=1;q<=Z;q++)Y.push(Q.getX(0)),Y.push(Q.getX(q)),Y.push(Q.getX(q+1));else for(let q=0;q<Z;q++)if(q%2===0)Y.push(Q.getX(q)),Y.push(Q.getX(q+1)),Y.push(Q.getX(q+2));else Y.push(Q.getX(q+2)),Y.push(Q.getX(q+1)),Y.push(Q.getX(q));if(Y.length/3!==Z)console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let V=$.clone();return V.setIndex(Y),V.clearGroups(),V}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",J),$}var qU=pQ(()=>{ZQ()});var pU={};nY(pU,{GLTFLoader:()=>OU});function qL(){let $={};return{get:function(J){return $[J]},add:function(J,Q){$[J]=Q},remove:function(J){delete $[J]},removeAll:function(){$={}}}}class LU{constructor($){this.parser=$,this.name=x$.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let $=this.parser,J=this.parser.json.nodes||[];for(let Q=0,Z=J.length;Q<Z;Q++){let Y=J[Q];if(Y.extensions&&Y.extensions[this.name]&&Y.extensions[this.name].light!==void 0)$._addNodeRef(this.cache,Y.extensions[this.name].light)}}_loadLight($){let J=this.parser,Q="light:"+$,Z=J.cache.get(Q);if(Z)return Z;let Y=J.json,U=((Y.extensions&&Y.extensions[this.name]||{}).lights||[])[$],F,N=new y$(16777215);if(U.color!==void 0)N.setRGB(U.color[0],U.color[1],U.color[2],n9);let L=U.range!==void 0?U.range:0;switch(U.type){case"directional":F=new iJ(N),F.target.position.set(0,0,-1),F.add(F.target);break;case"point":F=new $Q(N),F.distance=L;break;case"spot":F=new RW(N),F.distance=L,U.spot=U.spot||{},U.spot.innerConeAngle=U.spot.innerConeAngle!==void 0?U.spot.innerConeAngle:0,U.spot.outerConeAngle=U.spot.outerConeAngle!==void 0?U.spot.outerConeAngle:Math.PI/4,F.angle=U.spot.outerConeAngle,F.penumbra=1-U.spot.innerConeAngle/U.spot.outerConeAngle,F.target.position.set(0,0,-1),F.add(F.target);break;default:throw Error("THREE.GLTFLoader: Unexpected light type: "+U.type)}if(F.position.set(0,0,0),D8(F,U),U.intensity!==void 0)F.intensity=U.intensity;return F.name=J.createUniqueName(U.name||"light_"+$),Z=Promise.resolve(F),J.cache.add(Q,Z),Z}getDependency($,J){if($!=="light")return;return this._loadLight(J)}createNodeAttachment($){let J=this,Q=this.parser,Y=Q.json.nodes[$],q=(Y.extensions&&Y.extensions[this.name]||{}).light;if(q===void 0)return null;return this._loadLight(q).then(function(U){return Q._getNodeRef(J.cache,q,U)})}}class IU{constructor(){this.name=x$.KHR_MATERIALS_UNLIT}getMaterialType(){return Y9}extendParams($,J,Q){let Z=[];$.color=new y$(1,1,1),$.opacity=1;let Y=J.pbrMetallicRoughness;if(Y){if(Array.isArray(Y.baseColorFactor)){let V=Y.baseColorFactor;$.color.setRGB(V[0],V[1],V[2],n9),$.opacity=V[3]}if(Y.baseColorTexture!==void 0)Z.push(Q.assignTexture($,"map",Y.baseColorTexture,I8))}return Promise.all(Z)}}class DU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=Z.extensions[this.name].emissiveStrength;if(Y!==void 0)J.emissiveIntensity=Y;return Promise.resolve()}}class PU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_CLEARCOAT}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(V.clearcoatFactor!==void 0)J.clearcoat=V.clearcoatFactor;if(V.clearcoatTexture!==void 0)Y.push(Q.assignTexture(J,"clearcoatMap",V.clearcoatTexture));if(V.clearcoatRoughnessFactor!==void 0)J.clearcoatRoughness=V.clearcoatRoughnessFactor;if(V.clearcoatRoughnessTexture!==void 0)Y.push(Q.assignTexture(J,"clearcoatRoughnessMap",V.clearcoatRoughnessTexture));if(V.clearcoatNormalTexture!==void 0){if(Y.push(Q.assignTexture(J,"clearcoatNormalMap",V.clearcoatNormalTexture)),V.clearcoatNormalTexture.scale!==void 0){let q=V.clearcoatNormalTexture.scale;J.clearcoatNormalScale=new P5(q,q)}}return Promise.all(Y)}}class GU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_DISPERSION}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=Z.extensions[this.name];return J.dispersion=Y.dispersion!==void 0?Y.dispersion:0,Promise.resolve()}}class EU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_IRIDESCENCE}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(V.iridescenceFactor!==void 0)J.iridescence=V.iridescenceFactor;if(V.iridescenceTexture!==void 0)Y.push(Q.assignTexture(J,"iridescenceMap",V.iridescenceTexture));if(V.iridescenceIor!==void 0)J.iridescenceIOR=V.iridescenceIor;if(J.iridescenceThicknessRange===void 0)J.iridescenceThicknessRange=[100,400];if(V.iridescenceThicknessMinimum!==void 0)J.iridescenceThicknessRange[0]=V.iridescenceThicknessMinimum;if(V.iridescenceThicknessMaximum!==void 0)J.iridescenceThicknessRange[1]=V.iridescenceThicknessMaximum;if(V.iridescenceThicknessTexture!==void 0)Y.push(Q.assignTexture(J,"iridescenceThicknessMap",V.iridescenceThicknessTexture));return Promise.all(Y)}}class RU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_SHEEN}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[];J.sheenColor=new y$(0,0,0),J.sheenRoughness=0,J.sheen=1;let V=Z.extensions[this.name];if(V.sheenColorFactor!==void 0){let q=V.sheenColorFactor;J.sheenColor.setRGB(q[0],q[1],q[2],n9)}if(V.sheenRoughnessFactor!==void 0)J.sheenRoughness=V.sheenRoughnessFactor;if(V.sheenColorTexture!==void 0)Y.push(Q.assignTexture(J,"sheenColorMap",V.sheenColorTexture,I8));if(V.sheenRoughnessTexture!==void 0)Y.push(Q.assignTexture(J,"sheenRoughnessMap",V.sheenRoughnessTexture));return Promise.all(Y)}}class jU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_TRANSMISSION}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(V.transmissionFactor!==void 0)J.transmission=V.transmissionFactor;if(V.transmissionTexture!==void 0)Y.push(Q.assignTexture(J,"transmissionMap",V.transmissionTexture));return Promise.all(Y)}}class CU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_VOLUME}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(J.thickness=V.thicknessFactor!==void 0?V.thicknessFactor:0,V.thicknessTexture!==void 0)Y.push(Q.assignTexture(J,"thicknessMap",V.thicknessTexture));J.attenuationDistance=V.attenuationDistance||1/0;let q=V.attenuationColor||[1,1,1];return J.attenuationColor=new y$().setRGB(q[0],q[1],q[2],n9),Promise.all(Y)}}class MU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_IOR}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=Z.extensions[this.name];return J.ior=Y.ior!==void 0?Y.ior:1.5,Promise.resolve()}}class vU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_SPECULAR}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(J.specularIntensity=V.specularFactor!==void 0?V.specularFactor:1,V.specularTexture!==void 0)Y.push(Q.assignTexture(J,"specularIntensityMap",V.specularTexture));let q=V.specularColorFactor||[1,1,1];if(J.specularColor=new y$().setRGB(q[0],q[1],q[2],n9),V.specularColorTexture!==void 0)Y.push(Q.assignTexture(J,"specularColorMap",V.specularColorTexture,I8));return Promise.all(Y)}}class AU{constructor($){this.parser=$,this.name=x$.EXT_MATERIALS_BUMP}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(J.bumpScale=V.bumpFactor!==void 0?V.bumpFactor:1,V.bumpTexture!==void 0)Y.push(Q.assignTexture(J,"bumpMap",V.bumpTexture));return Promise.all(Y)}}class TU{constructor($){this.parser=$,this.name=x$.KHR_MATERIALS_ANISOTROPY}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return k7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let Y=[],V=Z.extensions[this.name];if(V.anisotropyStrength!==void 0)J.anisotropy=V.anisotropyStrength;if(V.anisotropyRotation!==void 0)J.anisotropyRotation=V.anisotropyRotation;if(V.anisotropyTexture!==void 0)Y.push(Q.assignTexture(J,"anisotropyMap",V.anisotropyTexture));return Promise.all(Y)}}class SU{constructor($){this.parser=$,this.name=x$.KHR_TEXTURE_BASISU}loadTexture($){let J=this.parser,Q=J.json,Z=Q.textures[$];if(!Z.extensions||!Z.extensions[this.name])return null;let Y=Z.extensions[this.name],V=J.options.ktx2Loader;if(!V)if(Q.extensionsRequired&&Q.extensionsRequired.indexOf(this.name)>=0)throw Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");else return null;return J.loadTextureImage($,Y.source,V)}}class kU{constructor($){this.parser=$,this.name=x$.EXT_TEXTURE_WEBP}loadTexture($){let J=this.name,Q=this.parser,Z=Q.json,Y=Z.textures[$];if(!Y.extensions||!Y.extensions[J])return null;let V=Y.extensions[J],q=Z.images[V.source],U=Q.textureLoader;if(q.uri){let F=Q.options.manager.getHandler(q.uri);if(F!==null)U=F}return Q.loadTextureImage($,V.source,U)}}class zU{constructor($){this.parser=$,this.name=x$.EXT_TEXTURE_AVIF}loadTexture($){let J=this.name,Q=this.parser,Z=Q.json,Y=Z.textures[$];if(!Y.extensions||!Y.extensions[J])return null;let V=Y.extensions[J],q=Z.images[V.source],U=Q.textureLoader;if(q.uri){let F=Q.options.manager.getHandler(q.uri);if(F!==null)U=F}return Q.loadTextureImage($,V.source,U)}}class wU{constructor($){this.name=x$.EXT_MESHOPT_COMPRESSION,this.parser=$}loadBufferView($){let J=this.parser.json,Q=J.bufferViews[$];if(Q.extensions&&Q.extensions[this.name]){let Z=Q.extensions[this.name],Y=this.parser.getDependency("buffer",Z.buffer),V=this.parser.options.meshoptDecoder;if(!V||!V.supported)if(J.extensionsRequired&&J.extensionsRequired.indexOf(this.name)>=0)throw Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");else return null;return Y.then(function(q){let U=Z.byteOffset||0,F=Z.byteLength||0,N=Z.count,L=Z.byteStride,I=new Uint8Array(q,U,F);if(V.decodeGltfBufferAsync)return V.decodeGltfBufferAsync(N,L,I,Z.mode,Z.filter).then(function(P){return P.buffer});else return V.ready.then(function(){let P=new ArrayBuffer(N*L);return V.decodeGltfBuffer(new Uint8Array(P),N,L,I,Z.mode,Z.filter),P})})}else return null}}class _U{constructor($){this.name=x$.EXT_MESH_GPU_INSTANCING,this.parser=$}createNodeMesh($){let J=this.parser.json,Q=J.nodes[$];if(!Q.extensions||!Q.extensions[this.name]||Q.mesh===void 0)return null;let Z=J.meshes[Q.mesh];for(let F of Z.primitives)if(F.mode!==_7.TRIANGLES&&F.mode!==_7.TRIANGLE_STRIP&&F.mode!==_7.TRIANGLE_FAN&&F.mode!==void 0)return null;let V=Q.extensions[this.name].attributes,q=[],U={};for(let F in V)q.push(this.parser.getDependency("accessor",V[F]).then((N)=>{return U[F]=N,U[F]}));if(q.length<1)return null;return q.push(this.parser.createNodeMesh($)),Promise.all(q).then((F)=>{let N=F.pop(),L=N.isGroup?N.children:[N],I=F[0].count,P=[];for(let C of L){let M=new L8,A=new M9,R=new i5,E=new M9(1,1,1),y=new r$(C.geometry,C.material,I);for(let G=0;G<I;G++){if(U.TRANSLATION)A.fromBufferAttribute(U.TRANSLATION,G);if(U.ROTATION)R.fromBufferAttribute(U.ROTATION,G);if(U.SCALE)E.fromBufferAttribute(U.SCALE,G);y.setMatrixAt(G,M.compose(A,R,E))}for(let G in U)if(G==="_COLOR_0"){let f=U[G];y.instanceColor=new L5(f.array,f.itemSize,f.normalized)}else if(G!=="TRANSLATION"&&G!=="ROTATION"&&G!=="SCALE")C.geometry.setAttribute(G,U[G]);o8.prototype.copy.call(y,C),this.parser.assignFinalMaterial(y),P.push(y)}if(N.isGroup)return N.clear(),N.add(...P),N;return P[0]})}}class fU{constructor($){this.name=x$.KHR_BINARY_GLTF,this.content=null,this.body=null;let J=new DataView($,0,XQ),Q=new TextDecoder;if(this.header={magic:Q.decode(new Uint8Array($.slice(0,4))),version:J.getUint32(4,!0),length:J.getUint32(8,!0)},this.header.magic!==yU)throw Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");else if(this.header.version<2)throw Error("THREE.GLTFLoader: Legacy binary file detected.");let Z=this.header.length-XQ,Y=new DataView($,XQ),V=0;while(V<Z){let q=Y.getUint32(V,!0);V+=4;let U=Y.getUint32(V,!0);if(V+=4,U===HU.JSON){let F=new Uint8Array($,XQ+V,q);this.content=Q.decode(F)}else if(U===HU.BIN){let F=XQ+V;this.body=$.slice(F,F+q)}V+=q}if(this.content===null)throw Error("THREE.GLTFLoader: JSON content not found.")}}class bU{constructor($,J){if(!J)throw Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=x$.KHR_DRACO_MESH_COMPRESSION,this.json=$,this.dracoLoader=J,this.dracoLoader.preload()}decodePrimitive($,J){let Q=this.json,Z=this.dracoLoader,Y=$.extensions[this.name].bufferView,V=$.extensions[this.name].attributes,q={},U={},F={};for(let N in V){let L=kW[N]||N.toLowerCase();q[L]=V[N]}for(let N in $.attributes){let L=kW[N]||N.toLowerCase();if(V[N]!==void 0){let I=Q.accessors[$.attributes[N]],P=$J[I.componentType];F[L]=P.name,U[L]=I.normalized===!0}}return J.getDependency("bufferView",Y).then(function(N){return new Promise(function(L,I){Z.decodeDracoFile(N,function(P){for(let C in P.attributes){let M=P.attributes[C],A=U[C];if(A!==void 0)M.normalized=A}L(P)},q,F,n9,I)})})}}class hU{constructor(){this.name=x$.KHR_TEXTURE_TRANSFORM}extendTexture($,J){if((J.texCoord===void 0||J.texCoord===$.channel)&&J.offset===void 0&&J.rotation===void 0&&J.scale===void 0)return $;if($=$.clone(),J.texCoord!==void 0)$.channel=J.texCoord;if(J.offset!==void 0)$.offset.fromArray(J.offset);if(J.rotation!==void 0)$.rotation=J.rotation;if(J.scale!==void 0)$.repeat.fromArray(J.scale);return $.needsUpdate=!0,$}}class xU{constructor(){this.name=x$.KHR_MESH_QUANTIZATION}}function BL($){if($.DefaultMaterial===void 0)$.DefaultMaterial=new s6({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:WW});return $.DefaultMaterial}function a5($,J,Q){for(let Z in Q.extensions)if($[Z]===void 0)J.userData.gltfExtensions=J.userData.gltfExtensions||{},J.userData.gltfExtensions[Z]=Q.extensions[Z]}function D8($,J){if(J.extras!==void 0)if(typeof J.extras==="object")Object.assign($.userData,J.extras);else console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+J.extras)}function NL($,J,Q){let Z=!1,Y=!1,V=!1;for(let N=0,L=J.length;N<L;N++){let I=J[N];if(I.POSITION!==void 0)Z=!0;if(I.NORMAL!==void 0)Y=!0;if(I.COLOR_0!==void 0)V=!0;if(Z&&Y&&V)break}if(!Z&&!Y&&!V)return Promise.resolve($);let q=[],U=[],F=[];for(let N=0,L=J.length;N<L;N++){let I=J[N];if(Z){let P=I.POSITION!==void 0?Q.getDependency("accessor",I.POSITION):$.attributes.position;q.push(P)}if(Y){let P=I.NORMAL!==void 0?Q.getDependency("accessor",I.NORMAL):$.attributes.normal;U.push(P)}if(V){let P=I.COLOR_0!==void 0?Q.getDependency("accessor",I.COLOR_0):$.attributes.color;F.push(P)}}return Promise.all([Promise.all(q),Promise.all(U),Promise.all(F)]).then(function(N){let L=N[0],I=N[1],P=N[2];if(Z)$.morphAttributes.position=L;if(Y)$.morphAttributes.normal=I;if(V)$.morphAttributes.color=P;return $.morphTargetsRelative=!0,$})}function OL($,J){if($.updateMorphTargets(),J.weights!==void 0)for(let Q=0,Z=J.weights.length;Q<Z;Q++)$.morphTargetInfluences[Q]=J.weights[Q];if(J.extras&&Array.isArray(J.extras.targetNames)){let Q=J.extras.targetNames;if($.morphTargetInfluences.length===Q.length){$.morphTargetDictionary={};for(let Z=0,Y=Q.length;Z<Y;Z++)$.morphTargetDictionary[Q[Z]]=Z}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function LL($){let J,Q=$.extensions&&$.extensions[x$.KHR_DRACO_MESH_COMPRESSION];if(Q)J="draco:"+Q.bufferView+":"+Q.indices+":"+SW(Q.attributes);else J=$.indices+":"+SW($.attributes)+":"+$.mode;if($.targets!==void 0)for(let Z=0,Y=$.targets.length;Z<Y;Z++)J+=":"+SW($.targets[Z]);return J}function SW($){let J="",Q=Object.keys($).sort();for(let Z=0,Y=Q.length;Z<Y;Z++)J+=Q[Z]+":"+$[Q[Z]]+";";return J}function zW($){switch($){case Int8Array:return 0.007874015748031496;case Uint8Array:return 0.00392156862745098;case Int16Array:return 0.00003051850947599719;case Uint16Array:return 0.000015259021896696422;default:throw Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function IL($){if($.search(/\.jpe?g($|\?)/i)>0||$.search(/^data\:image\/jpeg/)===0)return"image/jpeg";if($.search(/\.webp($|\?)/i)>0||$.search(/^data\:image\/webp/)===0)return"image/webp";if($.search(/\.ktx2($|\?)/i)>0||$.search(/^data\:image\/ktx2/)===0)return"image/ktx2";return"image/png"}class uU{constructor($={},J={}){this.json=$,this.extensions={},this.plugins={},this.options=J,this.cache=new qL,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let Q=!1,Z=-1,Y=!1,V=-1;if(typeof navigator<"u"){let q=navigator.userAgent;Q=/^((?!chrome|android).)*safari/i.test(q)===!0;let U=q.match(/Version\/(\d+)/);Z=Q&&U?parseInt(U[1],10):-1,Y=q.indexOf("Firefox")>-1,V=Y?q.match(/Firefox\/([0-9]+)\./)[1]:-1}if(typeof createImageBitmap>"u"||Q&&Z<17||Y&&V<98)this.textureLoader=new jW(this.options.manager);else this.textureLoader=new VW(this.options.manager);if(this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new wZ(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials")this.fileLoader.setWithCredentials(!0)}setExtensions($){this.extensions=$}setPlugins($){this.plugins=$}parse($,J){let Q=this,Z=this.json,Y=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(V){return V._markDefs&&V._markDefs()}),Promise.all(this._invokeAll(function(V){return V.beforeRoot&&V.beforeRoot()})).then(function(){return Promise.all([Q.getDependencies("scene"),Q.getDependencies("animation"),Q.getDependencies("camera")])}).then(function(V){let q={scene:V[0][Z.scene||0],scenes:V[0],animations:V[1],cameras:V[2],asset:Z.asset,parser:Q,userData:{}};return a5(Y,q,Z),D8(q,Z),Promise.all(Q._invokeAll(function(U){return U.afterRoot&&U.afterRoot(q)})).then(function(){for(let U of q.scenes)U.updateMatrixWorld();$(q)})}).catch(J)}_markDefs(){let $=this.json.nodes||[],J=this.json.skins||[],Q=this.json.meshes||[];for(let Z=0,Y=J.length;Z<Y;Z++){let V=J[Z].joints;for(let q=0,U=V.length;q<U;q++)$[V[q]].isBone=!0}for(let Z=0,Y=$.length;Z<Y;Z++){let V=$[Z];if(V.mesh!==void 0){if(this._addNodeRef(this.meshCache,V.mesh),V.skin!==void 0)Q[V.mesh].isSkinnedMesh=!0}if(V.camera!==void 0)this._addNodeRef(this.cameraCache,V.camera)}}_addNodeRef($,J){if(J===void 0)return;if($.refs[J]===void 0)$.refs[J]=$.uses[J]=0;$.refs[J]++}_getNodeRef($,J,Q){if($.refs[J]<=1)return Q;let Z=Q.clone(),Y=(V,q)=>{let U=this.associations.get(V);if(U!=null)this.associations.set(q,U);for(let[F,N]of V.children.entries())Y(N,q.children[F])};return Y(Q,Z),Z.name+="_instance_"+$.uses[J]++,Z}_invokeOne($){let J=Object.values(this.plugins);J.push(this);for(let Q=0;Q<J.length;Q++){let Z=$(J[Q]);if(Z)return Z}return null}_invokeAll($){let J=Object.values(this.plugins);J.unshift(this);let Q=[];for(let Z=0;Z<J.length;Z++){let Y=$(J[Z]);if(Y)Q.push(Y)}return Q}getDependency($,J){let Q=$+":"+J,Z=this.cache.get(Q);if(!Z){switch($){case"scene":Z=this.loadScene(J);break;case"node":Z=this._invokeOne(function(Y){return Y.loadNode&&Y.loadNode(J)});break;case"mesh":Z=this._invokeOne(function(Y){return Y.loadMesh&&Y.loadMesh(J)});break;case"accessor":Z=this.loadAccessor(J);break;case"bufferView":Z=this._invokeOne(function(Y){return Y.loadBufferView&&Y.loadBufferView(J)});break;case"buffer":Z=this.loadBuffer(J);break;case"material":Z=this._invokeOne(function(Y){return Y.loadMaterial&&Y.loadMaterial(J)});break;case"texture":Z=this._invokeOne(function(Y){return Y.loadTexture&&Y.loadTexture(J)});break;case"skin":Z=this.loadSkin(J);break;case"animation":Z=this._invokeOne(function(Y){return Y.loadAnimation&&Y.loadAnimation(J)});break;case"camera":Z=this.loadCamera(J);break;default:if(Z=this._invokeOne(function(Y){return Y!=this&&Y.getDependency&&Y.getDependency($,J)}),!Z)throw Error("Unknown type: "+$);break}this.cache.add(Q,Z)}return Z}getDependencies($){let J=this.cache.get($);if(!J){let Q=this,Z=this.json[$+($==="mesh"?"es":"s")]||[];J=Promise.all(Z.map(function(Y,V){return Q.getDependency($,V)})),this.cache.add($,J)}return J}loadBuffer($){let J=this.json.buffers[$],Q=this.fileLoader;if(J.type&&J.type!=="arraybuffer")throw Error("THREE.GLTFLoader: "+J.type+" buffer type is not supported.");if(J.uri===void 0&&$===0)return Promise.resolve(this.extensions[x$.KHR_BINARY_GLTF].body);let Z=this.options;return new Promise(function(Y,V){Q.load(s5.resolveURL(J.uri,Z.path),Y,void 0,function(){V(Error('THREE.GLTFLoader: Failed to load buffer "'+J.uri+'".'))})})}loadBufferView($){let J=this.json.bufferViews[$];return this.getDependency("buffer",J.buffer).then(function(Q){let Z=J.byteLength||0,Y=J.byteOffset||0;return Q.slice(Y,Y+Z)})}loadAccessor($){let J=this,Q=this.json,Z=this.json.accessors[$];if(Z.bufferView===void 0&&Z.sparse===void 0){let V=AW[Z.type],q=$J[Z.componentType],U=Z.normalized===!0,F=new q(Z.count*V);return Promise.resolve(new z9(F,V,U))}let Y=[];if(Z.bufferView!==void 0)Y.push(this.getDependency("bufferView",Z.bufferView));else Y.push(null);if(Z.sparse!==void 0)Y.push(this.getDependency("bufferView",Z.sparse.indices.bufferView)),Y.push(this.getDependency("bufferView",Z.sparse.values.bufferView));return Promise.all(Y).then(function(V){let q=V[0],U=AW[Z.type],F=$J[Z.componentType],N=F.BYTES_PER_ELEMENT,L=N*U,I=Z.byteOffset||0,P=Z.bufferView!==void 0?Q.bufferViews[Z.bufferView].byteStride:void 0,C=Z.normalized===!0,M,A;if(P&&P!==L){let R=Math.floor(I/P),E="InterleavedBuffer:"+Z.bufferView+":"+Z.componentType+":"+R+":"+Z.count,y=J.cache.get(E);if(!y)M=new F(q,R*P,Z.count*P/N),y=new fZ(M,P/N),J.cache.add(E,y);A=new bZ(y,U,I%P/N,C)}else{if(q===null)M=new F(Z.count*U);else M=new F(q,I,Z.count*U);A=new z9(M,U,C)}if(Z.sparse!==void 0){let R=AW.SCALAR,E=$J[Z.sparse.indices.componentType],y=Z.sparse.indices.byteOffset||0,G=Z.sparse.values.byteOffset||0,f=new E(V[1],y,Z.sparse.count*R),d=new F(V[2],G,Z.sparse.count*U);if(q!==null)A=new z9(A.array.slice(),A.itemSize,A.normalized);A.normalized=!1;for(let g=0,b=f.length;g<b;g++){let o=f[g];if(A.setX(o,d[g*U]),U>=2)A.setY(o,d[g*U+1]);if(U>=3)A.setZ(o,d[g*U+2]);if(U>=4)A.setW(o,d[g*U+3]);if(U>=5)throw Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}A.normalized=C}return A})}loadTexture($){let J=this.json,Q=this.options,Y=J.textures[$].source,V=J.images[Y],q=this.textureLoader;if(V.uri){let U=Q.manager.getHandler(V.uri);if(U!==null)q=U}return this.loadTextureImage($,Y,q)}loadTextureImage($,J,Q){let Z=this,Y=this.json,V=Y.textures[$],q=Y.images[J],U=(q.uri||q.bufferView)+":"+V.sampler;if(this.textureCache[U])return this.textureCache[U];let F=this.loadImageSource(J,Q).then(function(N){if(N.flipY=!1,N.name=V.name||q.name||"",N.name===""&&typeof q.uri==="string"&&q.uri.startsWith("data:image/")===!1)N.name=q.uri;let I=(Y.samplers||{})[V.sampler]||{};return N.magFilter=FU[I.magFilter]||w9,N.minFilter=FU[I.minFilter]||xZ,N.wrapS=BU[I.wrapS]||JQ,N.wrapT=BU[I.wrapT]||JQ,N.generateMipmaps=!N.isCompressedTexture&&N.minFilter!==I5&&N.minFilter!==w9,Z.associations.set(N,{textures:$}),N}).catch(function(){return null});return this.textureCache[U]=F,F}loadImageSource($,J){let Q=this,Z=this.json,Y=this.options;if(this.sourceCache[$]!==void 0)return this.sourceCache[$].then((L)=>L.clone());let V=Z.images[$],q=self.URL||self.webkitURL,U=V.uri||"",F=!1;if(V.bufferView!==void 0)U=Q.getDependency("bufferView",V.bufferView).then(function(L){F=!0;let I=new Blob([L],{type:V.mimeType});return U=q.createObjectURL(I),U});else if(V.uri===void 0)throw Error("THREE.GLTFLoader: Image "+$+" is missing URI and bufferView");let N=Promise.resolve(U).then(function(L){return new Promise(function(I,P){let C=I;if(J.isImageBitmapLoader===!0)C=function(M){let A=new t6(M);A.needsUpdate=!0,I(A)};J.load(s5.resolveURL(L,Y.path),C,void 0,P)})}).then(function(L){if(F===!0)q.revokeObjectURL(U);return D8(L,V),L.userData.mimeType=V.mimeType||IL(V.uri),L}).catch(function(L){throw console.error("THREE.GLTFLoader: Couldn't load texture",U),L});return this.sourceCache[$]=N,N}assignTexture($,J,Q,Z){let Y=this;return this.getDependency("texture",Q.index).then(function(V){if(!V)return null;if(Q.texCoord!==void 0&&Q.texCoord>0)V=V.clone(),V.channel=Q.texCoord;if(Y.extensions[x$.KHR_TEXTURE_TRANSFORM]){let q=Q.extensions!==void 0?Q.extensions[x$.KHR_TEXTURE_TRANSFORM]:void 0;if(q){let U=Y.associations.get(V);V=Y.extensions[x$.KHR_TEXTURE_TRANSFORM].extendTexture(V,q),Y.associations.set(V,U)}}if(Z!==void 0)V.colorSpace=Z;return $[J]=V,V})}assignFinalMaterial($){let{geometry:J,material:Q}=$,Z=J.attributes.tangent===void 0,Y=J.attributes.color!==void 0,V=J.attributes.normal===void 0;if($.isPoints){let q="PointsMaterial:"+Q.uuid,U=this.cache.get(q);if(!U)U=new w7,rJ.prototype.copy.call(U,Q),U.color.copy(Q.color),U.map=Q.map,U.sizeAttenuation=!1,this.cache.add(q,U);Q=U}else if($.isLine){let q="LineBasicMaterial:"+Q.uuid,U=this.cache.get(q);if(!U)U=new o6,rJ.prototype.copy.call(U,Q),U.color.copy(Q.color),U.map=Q.map,this.cache.add(q,U);Q=U}if(Z||Y||V){let q="ClonedMaterial:"+Q.uuid+":";if(Z)q+="derivative-tangents:";if(Y)q+="vertex-colors:";if(V)q+="flat-shading:";let U=this.cache.get(q);if(!U){if(U=Q.clone(),Y)U.vertexColors=!0;if(V)U.flatShading=!0;if(Z){if(U.normalScale)U.normalScale.y*=-1;if(U.clearcoatNormalScale)U.clearcoatNormalScale.y*=-1}this.cache.add(q,U),this.associations.set(U,this.associations.get(Q))}Q=U}$.material=Q}getMaterialType(){return s6}loadMaterial($){let J=this,Q=this.json,Z=this.extensions,Y=Q.materials[$],V,q={},U=Y.extensions||{},F=[];if(U[x$.KHR_MATERIALS_UNLIT]){let L=Z[x$.KHR_MATERIALS_UNLIT];V=L.getMaterialType(),F.push(L.extendParams(q,Y,J))}else{let L=Y.pbrMetallicRoughness||{};if(q.color=new y$(1,1,1),q.opacity=1,Array.isArray(L.baseColorFactor)){let I=L.baseColorFactor;q.color.setRGB(I[0],I[1],I[2],n9),q.opacity=I[3]}if(L.baseColorTexture!==void 0)F.push(J.assignTexture(q,"map",L.baseColorTexture,I8));if(q.metalness=L.metallicFactor!==void 0?L.metallicFactor:1,q.roughness=L.roughnessFactor!==void 0?L.roughnessFactor:1,L.metallicRoughnessTexture!==void 0)F.push(J.assignTexture(q,"metalnessMap",L.metallicRoughnessTexture)),F.push(J.assignTexture(q,"roughnessMap",L.metallicRoughnessTexture));V=this._invokeOne(function(I){return I.getMaterialType&&I.getMaterialType($)}),F.push(Promise.all(this._invokeAll(function(I){return I.extendMaterialParams&&I.extendMaterialParams($,q)})))}if(Y.doubleSided===!0)q.side=m8;let N=Y.alphaMode||TW.OPAQUE;if(N===TW.BLEND)q.transparent=!0,q.depthWrite=!1;else if(q.transparent=!1,N===TW.MASK)q.alphaTest=Y.alphaCutoff!==void 0?Y.alphaCutoff:0.5;if(Y.normalTexture!==void 0&&V!==Y9){if(F.push(J.assignTexture(q,"normalMap",Y.normalTexture)),q.normalScale=new P5(1,1),Y.normalTexture.scale!==void 0){let L=Y.normalTexture.scale;q.normalScale.set(L,L)}}if(Y.occlusionTexture!==void 0&&V!==Y9){if(F.push(J.assignTexture(q,"aoMap",Y.occlusionTexture)),Y.occlusionTexture.strength!==void 0)q.aoMapIntensity=Y.occlusionTexture.strength}if(Y.emissiveFactor!==void 0&&V!==Y9){let L=Y.emissiveFactor;q.emissive=new y$().setRGB(L[0],L[1],L[2],n9)}if(Y.emissiveTexture!==void 0&&V!==Y9)F.push(J.assignTexture(q,"emissiveMap",Y.emissiveTexture,I8));return Promise.all(F).then(function(){let L=new V(q);if(Y.name)L.name=Y.name;if(D8(L,Y),J.associations.set(L,{materials:$}),Y.extensions)a5(Z,L,Y);return L})}createUniqueName($){let J=DW.sanitizeNodeName($||"");if(J in this.nodeNamesUsed)return J+"_"+ ++this.nodeNamesUsed[J];else return this.nodeNamesUsed[J]=0,J}loadGeometries($){let J=this,Q=this.extensions,Z=this.primitiveCache;function Y(q){return Q[x$.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(q,J).then(function(U){return NU(U,q,J)})}let V=[];for(let q=0,U=$.length;q<U;q++){let F=$[q],N=LL(F),L=Z[N];if(L)V.push(L.promise);else{let I;if(F.extensions&&F.extensions[x$.KHR_DRACO_MESH_COMPRESSION])I=Y(F);else I=NU(new p9,F,J);Z[N]={primitive:F,promise:I},V.push(I)}}return Promise.all(V)}loadMesh($){let J=this,Q=this.json,Z=this.extensions,Y=Q.meshes[$],V=Y.primitives,q=[];for(let U=0,F=V.length;U<F;U++){let N=V[U].material===void 0?BL(this.cache):this.getDependency("material",V[U].material);q.push(N)}return q.push(J.loadGeometries(V)),Promise.all(q).then(function(U){let F=U.slice(0,U.length-1),N=U[U.length-1],L=[];for(let P=0,C=N.length;P<C;P++){let M=N[P],A=V[P],R,E=F[P];if(A.mode===_7.TRIANGLES||A.mode===_7.TRIANGLE_STRIP||A.mode===_7.TRIANGLE_FAN||A.mode===void 0){if(R=Y.isSkinnedMesh===!0?new GW(M,E):new T0(M,E),R.isSkinnedMesh===!0)R.normalizeSkinWeights();if(A.mode===_7.TRIANGLE_STRIP)R.geometry=vW(R.geometry,QQ);else if(A.mode===_7.TRIANGLE_FAN)R.geometry=vW(R.geometry,e6)}else if(A.mode===_7.LINES)R=new n6(M,E);else if(A.mode===_7.LINE_STRIP)R=new qW(M,E);else if(A.mode===_7.LINE_LOOP)R=new HW(M,E);else if(A.mode===_7.POINTS)R=new z7(M,E);else throw Error("THREE.GLTFLoader: Primitive mode unsupported: "+A.mode);if(Object.keys(R.geometry.morphAttributes).length>0)OL(R,Y);if(R.name=J.createUniqueName(Y.name||"mesh_"+$),D8(R,Y),A.extensions)a5(Z,R,A);J.assignFinalMaterial(R),L.push(R)}for(let P=0,C=L.length;P<C;P++)J.associations.set(L[P],{meshes:$,primitives:P});if(L.length===1){if(Y.extensions)a5(Z,L[0],Y);return L[0]}let I=new t$;if(Y.extensions)a5(Z,I,Y);J.associations.set(I,{meshes:$});for(let P=0,C=L.length;P<C;P++)I.add(L[P]);return I})}loadCamera($){let J,Q=this.json.cameras[$],Z=Q[Q.type];if(!Z){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}if(Q.type==="perspective")J=new eJ(NW.radToDeg(Z.yfov),Z.aspectRatio||1,Z.znear||1,Z.zfar||2000000);else if(Q.type==="orthographic")J=new tJ(-Z.xmag,Z.xmag,Z.ymag,-Z.ymag,Z.znear,Z.zfar);if(Q.name)J.name=this.createUniqueName(Q.name);return D8(J,Q),Promise.resolve(J)}loadSkin($){let J=this.json.skins[$],Q=[];for(let Z=0,Y=J.joints.length;Z<Y;Z++)Q.push(this._loadNodeShallow(J.joints[Z]));if(J.inverseBindMatrices!==void 0)Q.push(this.getDependency("accessor",J.inverseBindMatrices));else Q.push(null);return Promise.all(Q).then(function(Z){let Y=Z.pop(),V=Z,q=[],U=[];for(let F=0,N=V.length;F<N;F++){let L=V[F];if(L){q.push(L);let I=new L8;if(Y!==null)I.fromArray(Y.array,F*16);U.push(I)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',J.joints[F])}return new PW(q,U)})}loadAnimation($){let J=this.json,Q=this,Z=J.animations[$],Y=Z.name?Z.name:"animation_"+$,V=[],q=[],U=[],F=[],N=[];for(let L=0,I=Z.channels.length;L<I;L++){let P=Z.channels[L],C=Z.samplers[P.sampler],M=P.target,A=M.node,R=Z.parameters!==void 0?Z.parameters[C.input]:C.input,E=Z.parameters!==void 0?Z.parameters[C.output]:C.output;if(M.node===void 0)continue;V.push(this.getDependency("node",A)),q.push(this.getDependency("accessor",R)),U.push(this.getDependency("accessor",E)),F.push(C),N.push(M)}return Promise.all([Promise.all(V),Promise.all(q),Promise.all(U),Promise.all(F),Promise.all(N)]).then(function(L){let I=L[0],P=L[1],C=L[2],M=L[3],A=L[4],R=[];for(let y=0,G=I.length;y<G;y++){let f=I[y],d=P[y],g=C[y],b=M[y],o=A[y];if(f===void 0)continue;if(f.updateMatrix)f.updateMatrix();let _=Q._createAnimationTracks(f,d,g,b,o);if(_)for(let z=0;z<_.length;z++)R.push(_[z])}let E=new QW(Y,void 0,R);return D8(E,Z),E})}createNodeMesh($){let J=this.json,Q=this,Z=J.nodes[$];if(Z.mesh===void 0)return null;return Q.getDependency("mesh",Z.mesh).then(function(Y){let V=Q._getNodeRef(Q.meshCache,Z.mesh,Y);if(Z.weights!==void 0)V.traverse(function(q){if(!q.isMesh)return;for(let U=0,F=Z.weights.length;U<F;U++)q.morphTargetInfluences[U]=Z.weights[U]});return V})}loadNode($){let J=this.json,Q=this,Z=J.nodes[$],Y=Q._loadNodeShallow($),V=[],q=Z.children||[];for(let F=0,N=q.length;F<N;F++)V.push(Q.getDependency("node",q[F]));let U=Z.skin===void 0?Promise.resolve(null):Q.getDependency("skin",Z.skin);return Promise.all([Y,Promise.all(V),U]).then(function(F){let N=F[0],L=F[1],I=F[2];if(I!==null)N.traverse(function(P){if(!P.isSkinnedMesh)return;P.bind(I,DL)});for(let P=0,C=L.length;P<C;P++)N.add(L[P]);return N})}_loadNodeShallow($){let J=this.json,Q=this.extensions,Z=this;if(this.nodeCache[$]!==void 0)return this.nodeCache[$];let Y=J.nodes[$],V=Y.name?Z.createUniqueName(Y.name):"",q=[],U=Z._invokeOne(function(F){return F.createNodeMesh&&F.createNodeMesh($)});if(U)q.push(U);if(Y.camera!==void 0)q.push(Z.getDependency("camera",Y.camera).then(function(F){return Z._getNodeRef(Z.cameraCache,Y.camera,F)}));return Z._invokeAll(function(F){return F.createNodeAttachment&&F.createNodeAttachment($)}).forEach(function(F){q.push(F)}),this.nodeCache[$]=Promise.all(q).then(function(F){let N;if(Y.isBone===!0)N=new ZW;else if(F.length>1)N=new t$;else if(F.length===1)N=F[0];else N=new o8;if(N!==F[0])for(let L=0,I=F.length;L<I;L++)N.add(F[L]);if(Y.name)N.userData.name=Y.name,N.name=V;if(D8(N,Y),Y.extensions)a5(Q,N,Y);if(Y.matrix!==void 0){let L=new L8;L.fromArray(Y.matrix),N.applyMatrix4(L)}else{if(Y.translation!==void 0)N.position.fromArray(Y.translation);if(Y.rotation!==void 0)N.quaternion.fromArray(Y.rotation);if(Y.scale!==void 0)N.scale.fromArray(Y.scale)}if(!Z.associations.has(N))Z.associations.set(N,{});else if(Y.mesh!==void 0&&Z.meshCache.refs[Y.mesh]>1){let L=Z.associations.get(N);Z.associations.set(N,{...L})}return Z.associations.get(N).nodes=$,N}),this.nodeCache[$]}loadScene($){let J=this.extensions,Q=this.json.scenes[$],Z=this,Y=new t$;if(Q.name)Y.name=Z.createUniqueName(Q.name);if(D8(Y,Q),Q.extensions)a5(J,Y,Q);let V=Q.nodes||[],q=[];for(let U=0,F=V.length;U<F;U++)q.push(Z.getDependency("node",V[U]));return Promise.all(q).then(function(U){for(let N=0,L=U.length;N<L;N++)Y.add(U[N]);let F=(N)=>{let L=new Map;for(let[I,P]of Z.associations)if(I instanceof rJ||I instanceof t6)L.set(I,P);return N.traverse((I)=>{let P=Z.associations.get(I);if(P!=null)L.set(I,P)}),L};return Z.associations=F(Y),Y})}_createAnimationTracks($,J,Q,Z,Y){let V=[],q=$.name?$.name:$.uuid,U=[];if(G5[Y.path]===G5.weights)$.traverse(function(I){if(I.morphTargetInfluences)U.push(I.name?I.name:I.uuid)});else U.push(q);let F;switch(G5[Y.path]){case G5.weights:F=lZ;break;case G5.rotation:F=mZ;break;case G5.translation:case G5.scale:F=nZ;break;default:switch(Q.itemSize){case 1:F=lZ;break;case 2:case 3:default:F=nZ;break}break}let N=Z.interpolation!==void 0?FL[Z.interpolation]:hZ,L=this._getArrayFromAccessor(Q);for(let I=0,P=U.length;I<P;I++){let C=new F(U[I]+"."+G5[Y.path],J.array,L,N);if(Z.interpolation==="CUBICSPLINE")this._createCubicSplineTrackInterpolant(C);V.push(C)}return V}_getArrayFromAccessor($){let J=$.array;if($.normalized){let Q=zW(J.constructor),Z=new Float32Array(J.length);for(let Y=0,V=J.length;Y<V;Y++)Z[Y]=J[Y]*Q;J=Z}return J}_createCubicSplineTrackInterpolant($){$.createInterpolant=function(Q){return new(this instanceof mZ?gU:wW)(this.times,this.values,this.getValueSize()/3,Q)},$.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function PL($,J,Q){let Z=J.attributes,Y=new l6;if(Z.POSITION!==void 0){let U=Q.json.accessors[Z.POSITION],F=U.min,N=U.max;if(F!==void 0&&N!==void 0){if(Y.set(new M9(F[0],F[1],F[2]),new M9(N[0],N[1],N[2])),U.normalized){let L=zW($J[U.componentType]);Y.min.multiplyScalar(L),Y.max.multiplyScalar(L)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let V=J.targets;if(V!==void 0){let U=new M9,F=new M9;for(let N=0,L=V.length;N<L;N++){let I=V[N];if(I.POSITION!==void 0){let P=Q.json.accessors[I.POSITION],C=P.min,M=P.max;if(C!==void 0&&M!==void 0){if(F.setX(Math.max(Math.abs(C[0]),Math.abs(M[0]))),F.setY(Math.max(Math.abs(C[1]),Math.abs(M[1]))),F.setZ(Math.max(Math.abs(C[2]),Math.abs(M[2]))),P.normalized){let A=zW($J[P.componentType]);F.multiplyScalar(A)}U.max(F)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}Y.expandByVector(U)}$.boundingBox=Y;let q=new EW;Y.getCenter(q.center),q.radius=Y.min.distanceTo(Y.max)/2,$.boundingSphere=q}function NU($,J,Q){let Z=J.attributes,Y=[];function V(q,U){return Q.getDependency("accessor",q).then(function(F){$.setAttribute(U,F)})}for(let q in Z){let U=kW[q]||q.toLowerCase();if(U in $.attributes)continue;Y.push(V(Z[q],U))}if(J.indices!==void 0&&!$.index){let q=Q.getDependency("accessor",J.indices).then(function(U){$.setIndex(U)});Y.push(q)}if(zZ.workingColorSpace!==n9&&"COLOR_0"in Z)console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${zZ.workingColorSpace}" not supported.`);return D8($,J),PL($,J,Q),Promise.all(Y).then(function(){return J.targets!==void 0?NL($,J.targets,Q):$})}var OU,x$,yU="glTF",XQ=12,HU,wW,HL,gU,_7,$J,FU,BU,AW,kW,G5,FL,TW,DL;var lU=pQ(()=>{ZQ();qU();OU=class OU extends BW{constructor($){super($);this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(J){return new PU(J)}),this.register(function(J){return new GU(J)}),this.register(function(J){return new SU(J)}),this.register(function(J){return new kU(J)}),this.register(function(J){return new zU(J)}),this.register(function(J){return new RU(J)}),this.register(function(J){return new jU(J)}),this.register(function(J){return new CU(J)}),this.register(function(J){return new MU(J)}),this.register(function(J){return new DU(J)}),this.register(function(J){return new vU(J)}),this.register(function(J){return new EU(J)}),this.register(function(J){return new TU(J)}),this.register(function(J){return new AU(J)}),this.register(function(J){return new LU(J)}),this.register(function(J){return new wU(J)}),this.register(function(J){return new _U(J)})}load($,J,Q,Z){let Y=this,V;if(this.resourcePath!=="")V=this.resourcePath;else if(this.path!==""){let F=s5.extractUrlBase($);V=s5.resolveURL(F,this.path)}else V=s5.extractUrlBase($);this.manager.itemStart($);let q=function(F){if(Z)Z(F);else console.error(F);Y.manager.itemError($),Y.manager.itemEnd($)},U=new wZ(this.manager);U.setPath(this.path),U.setResponseType("arraybuffer"),U.setRequestHeader(this.requestHeader),U.setWithCredentials(this.withCredentials),U.load($,function(F){try{Y.parse(F,V,function(N){J(N),Y.manager.itemEnd($)},q)}catch(N){q(N)}},Q,q)}setDRACOLoader($){return this.dracoLoader=$,this}setKTX2Loader($){return this.ktx2Loader=$,this}setMeshoptDecoder($){return this.meshoptDecoder=$,this}register($){if(this.pluginCallbacks.indexOf($)===-1)this.pluginCallbacks.push($);return this}unregister($){if(this.pluginCallbacks.indexOf($)!==-1)this.pluginCallbacks.splice(this.pluginCallbacks.indexOf($),1);return this}parse($,J,Q,Z){let Y,V={},q={},U=new TextDecoder;if(typeof $==="string")Y=JSON.parse($);else if($ instanceof ArrayBuffer)if(U.decode(new Uint8Array($,0,4))===yU){try{V[x$.KHR_BINARY_GLTF]=new fU($)}catch(L){if(Z)Z(L);return}Y=JSON.parse(V[x$.KHR_BINARY_GLTF].content)}else Y=JSON.parse(U.decode($));else Y=$;if(Y.asset===void 0||Y.asset.version[0]<2){if(Z)Z(Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let F=new uU(Y,{path:J||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});F.fileLoader.setRequestHeader(this.requestHeader);for(let N=0;N<this.pluginCallbacks.length;N++){let L=this.pluginCallbacks[N](F);if(!L.name)console.error("THREE.GLTFLoader: Invalid plugin found: missing name");q[L.name]=L,V[L.name]=!0}if(Y.extensionsUsed)for(let N=0;N<Y.extensionsUsed.length;++N){let L=Y.extensionsUsed[N],I=Y.extensionsRequired||[];switch(L){case x$.KHR_MATERIALS_UNLIT:V[L]=new IU;break;case x$.KHR_DRACO_MESH_COMPRESSION:V[L]=new bU(Y,this.dracoLoader);break;case x$.KHR_TEXTURE_TRANSFORM:V[L]=new hU;break;case x$.KHR_MESH_QUANTIZATION:V[L]=new xU;break;default:if(I.indexOf(L)>=0&&q[L]===void 0)console.warn('THREE.GLTFLoader: Unknown extension "'+L+'".')}}F.setExtensions(V),F.setPlugins(q),F.parse(Q,Z)}parseAsync($,J){let Q=this;return new Promise(function(Z,Y){Q.parse($,J,Z,Y)})}};x$={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};HU={JSON:1313821514,BIN:5130562};wW=class wW extends KW{constructor($,J,Q,Z){super($,J,Q,Z)}copySampleValue_($){let J=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,Y=$*Z*3+Z;for(let V=0;V!==Z;V++)J[V]=Q[Y+V];return J}interpolate_($,J,Q,Z){let Y=this.resultBuffer,V=this.sampleValues,q=this.valueSize,U=q*2,F=q*3,N=Z-J,L=(Q-J)/N,I=L*L,P=I*L,C=$*F,M=C-F,A=-2*P+3*I,R=P-I,E=1-A,y=R-I+L;for(let G=0;G!==q;G++){let f=V[M+G+q],d=V[M+G+U]*N,g=V[C+G+q],b=V[C+G]*N;Y[G]=E*f+y*d+A*g+R*b}return Y}};HL=new i5;gU=class gU extends wW{interpolate_($,J,Q,Z){let Y=super.interpolate_($,J,Q,Z);return HL.fromArray(Y).normalize().toArray(Y),Y}};_7={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},$J={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},FU={9728:I5,9729:w9,9984:IW,9985:FW,9986:LW,9987:xZ},BU={33071:d6,33648:OW,10497:JQ},AW={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},kW={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},G5={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},FL={CUBICSPLINE:void 0,LINEAR:hZ,STEP:UW},TW={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};DL=new L8});ZQ();(function(){var $=window.SZGameUIFont&&window.SZGameUIFont.family||"sans-serif",J={w:1280,h:720,world:160,style:"floresta",bloom:!0,bloomStrength:1,vignette:!0},Q={hills:2.5,smooth:6},Z={floresta:{skyTop:"#6db8f2",skyBot:"#e8f4d2",low:"#3e7c3a",high:"#7ca63f",rock:"#8a8f7e",fog:"#cfe4c8",grip:1,grass:["#2f6b2f","#8fc24a"],grassK:1},praia:{skyTop:"#5fc0ee",skyBot:"#fdeec9",low:"#e3cb8d",high:"#d2b268",rock:"#b3a284",fog:"#f2e4c2",grip:1,grass:["#7ea35a","#c9d97a"],grassK:0.5},neve:{skyTop:"#9dbcdd",skyBot:"#eef4fb",low:"#dfe8f2",high:"#ffffff",rock:"#9fb0c0",fog:"#e3ecf6",grip:0.45,grass:["#b9c8d8","#eef4fb"],grassK:0.25},deserto:{skyTop:"#74aee6",skyBot:"#f6d8a6",low:"#d3a05c",high:"#e6c079",rock:"#a3794c",fog:"#ecd8ae",grip:1,grass:["#8a8a4a","#c9c96a"],grassK:0.2},primavera:{skyTop:"#85cbf4",skyBot:"#f8e2ef",low:"#579a49",high:"#8cc061",rock:"#96917f",fog:"#e1eed6",grip:1,grass:["#3f7a3a","#9ed36a"],grassK:1},lua:{skyTop:"#0b0d1a",skyBot:"#2a2440",low:"#6b7080",high:"#9aa1b0",rock:"#565b68",fog:"#1a1c2a",grip:1,grass:["#6b7080","#9aa1b0"],grassK:0,gravity:0.4,ground2:"#565b68"},fazenda:{skyTop:"#7cc4f0",skyBot:"#f6ecc0",low:"#5a8c3e",high:"#a8b84e",rock:"#8f8468",fog:"#e8ecc8",grip:1,grass:["#4a7a34","#c2c85e"],grassK:0.8,ground2:"#5a7a2e"}},Y={passeio:{w:1.7,h:0.6,l:3,wheel:0.42,clear:0.34,cab:0.5,speed:22,turn:110,jump:7},jipe:{w:1.8,h:0.7,l:3.2,wheel:0.56,clear:0.52,cab:0.56,speed:20,turn:100,jump:8},corrida:{w:1.9,h:0.42,l:3.6,wheel:0.44,clear:0.24,cab:0.34,speed:30,turn:120,jump:6}},V=!1,q=!1,U=!1,F=!1,N={},L={},I=[],P=[],C=null,M=null,A=null,R=null,E=null,y=null,G=null,f=null,d=null,g=null,b=null,o=null,_=null,z=null,x=null,r=0,e=0,Q0=0,J0=null,K0=null,F0=null,U0=null,C0=!1,x0=!1,e0=!1,p0=null,z$=null,M$=null,B0=null,w0=Object.create(null),D0=null,t0=null,N$=Object.create(null),X$=null,I9=0,l={x:0,z:0,yaw:0},f$=[],L$=[],q$=Object.create(null),i0=Object.create(null),b$=null,o0=null,W$=[],F9=null,s0=[],G0=null,u={start:[],checkpoint:[],finish:[]},T=[],i=null,V0=null,n=null,W0=null,R0=null,j0=[],a0=22,U$=1,L0=null,_0=0,l0=!0,r0="seguir",v0=0,F$=0,m=[],S0=[],A0=null,d0=12000,P0=0,O0=48,n0=500000,I$=2000000,n$=0,l$=200,Z7=[],s9=0,J8=!1,E5=[],h9=null,X7=null,i9=null,r5=0,P8=0,JJ=!1,t5=!1,q9=null,WQ=0,a9=0,QJ=!1,G8=null,Q8=null,w=null,a=0,Z0=256,X0=0,t=6,I0="lisa",k0=null,c0=!1,g0=[],H$="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,KeyB,KeyA",Y$=null,J$=null,D$=null,g$=null,e$=1,S$=[],d$=null,$$=null,p$=null,u$=0,G9=400,y7=["#f472b6","#facc15","#4ade80","#22d3ee","#a78bfa"],v9=[],U7=null,Z9=null,O9=null,V9=null,A9="nenhuma",_9=0,r9=null,I7=0,E8=null,e5=[],R8=[],R5=null,_W=256,iZ=0,yW=24,$6=null,J6=[],YQ=[],ZJ=[],VQ=[],j5=[],l9=null,s$=null,T9=null,XJ=[],C5=null,f7=[],Z8=null,L9=null,fW=24,b7=null,W7=null,WJ=[],bW=6,Q6=null,s8=null,R$=null,B$=null,D9=null,X8=null,B9=!0,hW={entrar:[],sair:[]},i8=null,j8=null,aZ=0,YJ=null,VJ=null,P9=null,q7=null,a8="car",r8=null,KQ=[],M5=[],t8="desligado",e8=null,KJ=0,D7=[],xW=8,UJ=Object.create(null),P7=Object.create(null),H9=null,rZ=[],h7=null,UQ=!1,qJ=[],HJ=[],tZ=0,eZ=0,$4=0,J4=0,P$=null,Q4=0,W8=null,Y8=null,Z4=512,qQ=0,HQ=[],$5=null,C8=[],FJ=Object.create(null),x7=null,FQ=[],J5=null,G7=null,BJ=Object.create(null),V8=null,NJ="off",M8=null,v8=null,X4=0,W4=!1,W9=null,gW=0,g7=null,BQ=[],Z6=null,q0=null,X6=null,j$=null,E7=null,Y4=24,NQ=Object.create(null),V4=0,K4=[],uW=typeof window<"u"&&window.__SZGAME_ASSETS_3D&&typeof window.__SZGAME_ASSETS_3D==="object"?window.__SZGAME_ASSETS_3D:{},OQ=typeof window<"u"&&window.__SZGAME_SOUNDS&&typeof window.__SZGAME_SOUNDS==="object"?window.__SZGAME_SOUNDS:{},U4=typeof window<"u"&&window.__SZGAME_ASSETS&&typeof window.__SZGAME_ASSETS==="object"?window.__SZGAME_ASSETS:{},q4=null,u7=null,p7=null,H4=null,LQ=[],K8=null,l7=null,IQ=null,v5=null,F4=0,DQ={on:!1,minutes:4},A5=!1,d7=10,B4=null,pW={dia:[],noite:[]},OJ=-1,T5=null,S5=null,k5=null,A8="limpo",Y7=null,T8=null,m7=null,N4=!1,PQ=null,c7=null,k$=null,R7=null,z5=1,K9={tier:"alta",auto:!0,decided:!1,probeT:0,fpsAcc:0,fpsN:0},GQ=Object.create(null),lW=!1;function z0(W){try{console.warn("SZWorld3D: "+W)}catch(X){}}var dW={};function C$(W,X){if(dW[W])return;dW[W]=!0,z0(X)}function k(W,X){if(W==null||W==="")return X;var K=Number(W);return typeof K==="number"&&isFinite(K)?K:X}function N0(W,X){if(W==null)return X;return String(W)}function f0(W,X,K){return W<X?X:W>K?K:W}function S8(W,X,K){var H=f0((K-W)/(X-W||1),0,1);return H*H*(3-2*H)}function O4(W,X){return 1-Math.exp(-W*X)}function U8(){return Z[J.style]||Z.floresta}function EQ(W,X){var K=W*374761393+X*668265263|0;return K=K^K>>>13|0,K=Math.imul(K,1274126177)|0,K=(K^K>>>16)>>>0,K/4294967296}function mW(W){return W*W*(3-2*W)}function dU(W,X){var K=Math.floor(W),H=Math.floor(X),B=W-K,O=X-H,D=EQ(K,H),j=EQ(K+1,H),v=EQ(K,H+1),S=EQ(K+1,H+1),h=mW(B),p=mW(O);return D+(j-D)*h+(v-D)*p+(D-j-v+S)*h*p}function k8(W,X){var K=1/Math.max(4,Q.smooth*8),H=0,B=1,O=K,D=0;for(var j=0;j<3;j++)H+=(dU(W*O+100,X*O+100)*2-1)*B,D+=B,B*=0.5,O*=2.1;H=H/D*Q.hills;var v=Math.sqrt(W*W+X*X);if(YJ){var S=0;for(var h=0;h<YJ.list.length;h++){var p=YJ.list[h],c=W-p.x,$0=X-p.z,H0=Math.sqrt(c*c+$0*$0),E0=1-S8(p.r*0.5,p.r,H0),M0=E0*p.h;if(M0>S)S=M0}return-4+S+H*0.3*S8(8,20,v)}return H*S8(8,20,v)}var t9=[];function cW(W,X,K,H,B,O){var D=B-K,j=O-H,v=D*D+j*j,S=v>0?((W-K)*D+(X-H)*j)/v:0;S=f0(S,0,1);var h=K+D*S,p=H+j*S,c=W-h,$0=X-p;return{dist:Math.sqrt(c*c+$0*$0),t:S}}function oW(W,X){var K=k8(W,X);for(var H=0;H<t9.length;H++){var B=t9[H];if(B.kind==="flatten"){var O=W-B.x,D=X-B.z,j=Math.sqrt(O*O+D*D),v=1-S8(B.r*0.7,B.r,j);if(v>0)K=K+(B.y-K)*v}else if(B.kind==="path"){var S=cW(W,X,B.x1,B.z1,B.x2,B.z2),h=1-S8(B.w*0.6,B.w,S.dist);if(h>0){var p=B.y1+(B.y2-B.y1)*S.t;K=K+(p-K)*h}}else if(B.kind==="crater"){var c=W-B.x,$0=X-B.z,H0=Math.sqrt(c*c+$0*$0);if(H0<B.r*1.5){var E0=1-S8(0,B.r*0.75,H0),M0=(1-S8(B.r*0.75,B.r*1.4,H0))*S8(B.r*0.35,B.r*0.8,H0);K=K-E0*B.depth+M0*B.rim}}}return K}function mU(W,X){var K=_;if(!K)return oW(W,X);var H=f0((W/K.world+0.5)*K.seg,0,K.seg),B=f0((X/K.world+0.5)*K.seg,0,K.seg),O=Math.min(K.seg-1,Math.floor(H)),D=Math.min(K.seg-1,Math.floor(B)),j=H-O,v=B-D,S=K.seg+1,h=K.values[D*S+O],p=K.values[(D+1)*S+O],c=K.values[(D+1)*S+O+1],$0=K.values[D*S+O+1];if(j+v<=1)return h+($0-h)*j+(p-h)*v;return c+(p-c)*(1-j)+($0-c)*(1-v)}function h0(W,X){return mU(k(W,0),k(X,0))}function d9(W,X,K){var H=h0(W,X);for(var B=0;B<KQ.length;B++){var O=KQ[B],D=cW(W,X,O.x1,O.z1,O.x2,O.z2);if(D.dist>O.w/2)continue;var j=O.y1+(O.y2-O.y1)*D.t+Math.sin(D.t*Math.PI)*1.2;if(K==null||K>j-0.8){if(j>H)H=j}}return H}var RQ={x:0,y:1,z:0};function cU(W,X){var K=0.6,H=h0(W-K,X),B=h0(W+K,X),O=h0(W,X-K),D=h0(W,X+K),j=H-B,v=O-D,S=2*K,h=Math.sqrt(j*j+S*S+v*v)||1;return RQ.x=j/h,RQ.y=S/h,RQ.z=v/h,RQ}function H7(W){var X=W|0;return function(){X=X+1831565813|0;var K=Math.imul(X^X>>>15,1|X);return K=K+Math.imul(K^K>>>7,61|K)^K,((K^K>>>14)>>>0)/4294967296}}function Q5(W){var X=J.world/2,K=(W+X)/(J.world||1);if(K<0)K=0;if(K>1)K=1;var H=Math.floor(K*Y4);return H>=Y4?Y4-1:H}function F7(W,X,K){var H={x:W,z:X,r:K,_stamp:0},B=Q5(W-K),O=Q5(X-K),D=Q5(W+K),j=Q5(X+K);for(var v=B;v<=D;v++)for(var S=O;S<=j;S++){var h=v+","+S;(NQ[h]||(NQ[h]=[])).push(H)}}function nW(W,X,K){V4++,K4.length=0;var H=Q5(W-K),B=Q5(X-K),O=Q5(W+K),D=Q5(X+K);for(var j=H;j<=O;j++)for(var v=B;v<=D;v++){var S=NQ[j+","+v];if(!S)continue;for(var h=0;h<S.length;h++){var p=S[h];if(p._stamp!==V4)p._stamp=V4,K4.push(p)}}return K4}var jQ={arvores:{collR:0.55,smin:0.8,smax:1.5,parts:[{g:"cyl",color:"#7c4a2d",x:0,y:0.8,z:0,sx:0.36,sy:1.6,sz:0.36},{g:"ico",color:"#3e8f3e",x:0,y:2.3,z:0,sx:2.4,sy:2.2,sz:2.4},{g:"ico",color:"#57a344",x:0.6,y:1.7,z:0.3,sx:1.5,sy:1.3,sz:1.5}]},pinheiros:{collR:0.5,smin:0.9,smax:1.7,parts:[{g:"cyl",color:"#6b4226",x:0,y:0.5,z:0,sx:0.3,sy:1,sz:0.3},{g:"cone",color:"#2d6a34",x:0,y:1.7,z:0,sx:2.2,sy:1.8,sz:2.2},{g:"cone",color:"#357c3c",x:0,y:2.8,z:0,sx:1.7,sy:1.5,sz:1.7},{g:"cone",color:"#3f8f46",x:0,y:3.7,z:0,sx:1.2,sy:1.2,sz:1.2}]},pedras:{collR:0.7,smin:0.5,smax:1.6,parts:[{g:"ico",color:"",x:0,y:0.4,z:0,sx:1.6,sy:1,sz:1.3}]},flores:{collR:0,smin:0.7,smax:1.2,parts:[{g:"cyl",color:"#3f9142",x:0,y:0.25,z:0,sx:0.07,sy:0.5,sz:0.07},{g:"ico",color:"#f472b6",x:0,y:0.55,z:0,sx:0.3,sy:0.3,sz:0.3}]},cogumelos:{collR:0,smin:0.5,smax:1.1,parts:[{g:"cyl",color:"#f5e6cf",x:0,y:0.22,z:0,sx:0.22,sy:0.44,sz:0.22},{g:"sph",color:"#dc2626",x:0,y:0.5,z:0,sx:0.7,sy:0.4,sz:0.7}]},cactos:{collR:0.4,smin:0.8,smax:1.4,parts:[{g:"cyl",color:"#3f9142",x:0,y:0.9,z:0,sx:0.5,sy:1.8,sz:0.5},{g:"cyl",color:"#357c3c",x:0.55,y:1.1,z:0,sx:0.3,sy:0.7,sz:0.3},{g:"cyl",color:"#357c3c",x:-0.55,y:0.85,z:0,sx:0.3,sy:0.6,sz:0.3}]},palmeiras:{collR:0.45,smin:0.9,smax:1.6,parts:[{g:"cyl",color:"#8a6a3f",x:0,y:1.6,z:0,sx:0.28,sy:3.2,sz:0.28},{g:"cone",color:"#2f9e44",x:0.9,y:3.3,z:0,sx:1.9,sy:0.34,sz:0.7},{g:"cone",color:"#2f9e44",x:-0.9,y:3.3,z:0,sx:1.9,sy:0.34,sz:0.7},{g:"cone",color:"#37a34a",x:0,y:3.3,z:0.9,sx:0.7,sy:0.34,sz:1.9},{g:"cone",color:"#37a34a",x:0,y:3.3,z:-0.9,sx:0.7,sy:0.34,sz:1.9}]}};function CQ(){if(j$)return j$;return j$={cyl:new Q9(0.5,0.5,1,10),cone:new d8(0.5,1,9),ico:new YW(0.5,0),sph:new D5(0.5,7,6)},j$}function x9(W){if(!E7)E7={};if(!E7[W])E7[W]=Q$({color:W});return E7[W]}function oU(W){if(W._locals)return W._locals;W._locals=[];var X=new i5;for(var K=0;K<W.parts.length;K++){var H=W.parts[K],B=new L8;B.compose(new M9(H.x||0,H.y||0,H.z||0),X,new M9(H.sx||1,H.sy||1,H.sz||1)),W._locals.push(B)}return W._locals}function nU(W,X){if(Math.sqrt(W*W+X*X)<10)return!0;for(var K=0;K<S0.length;K++){var H=S0[K],B=W-H.x,O=X-H.z;if(B*B+O*O<H.r*H.r)return!0}return!1}function MQ(){if(!A0)A0=new t$,G.add(A0);return A0}function m9(){if(!q0)q0=new o8;if(!X6)X6=new L8}function L4(W,X,K,H,B,O,D,j){q0.position.set(K,H,B),q0.rotation.set(0,O,0),q0.scale.set(D,D,D),q0.updateMatrix(),X6.multiplyMatrices(q0.matrix,j),W.setMatrixAt(X,X6)}function sW(W,X,K,H){var B=H7(4242+W.seed*101),O=J.world/2-3,D=[],j=X*10;while(D.length<X&&j-- >0){var v=(B()*2-1)*O,S=(B()*2-1)*O;if(nU(v,S))continue;D.push({x:v,z:S,yaw:B()*Math.PI*2,s:K+B()*(H-K)})}return D}function iW(W,X){var K=Math.max(1,Math.floor(k(X,1))),H=d0-P0;if(H<=0)return C$("scatter-budget","o mundo está cheio — teto de "+d0+" coisas espalhadas (para o passeio continuar liso)"),0;var B=Math.floor(H/K);if(W>B)return C$("scatter-budget","faltou espaço para tudo — espalhei só "+B+" cópias (teto de "+d0+" partes instanciadas)"),B;return W}function sU(W){var X=jQ[W.thing];if(!X||!G)return;var K=iW(Math.floor(f0(k(W.n,0),1,3000)),X.parts.length);if(K<=0)return;var H=sW(W,K,X.smin,X.smax);if(!H.length)return;P0+=H.length*X.parts.length,CQ(),m9();var B=oU(X),O=MQ();for(var D=0;D<X.parts.length;D++){var j=X.parts[D],v=new r$(j$[j.g],x9(j.color||U8().rock),H.length);v.castShadow=!0;for(var S=0;S<H.length;S++){var h=H[S];L4(v,S,h.x,h0(h.x,h.z),h.z,h.yaw,h.s,B[D])}if(v.instanceMatrix)v.instanceMatrix.needsUpdate=!0;O.add(v)}if(X.collR>0)for(var p=0;p<H.length;p++)F7(H[p].x,H[p].z,X.collR*H[p].s)}function iU(W){var X=jQ[W.thing];if(!X||!G)return;if(n$>=l$){C$("placed-max",'muitos "Pôr 1" — o teto é '+l$+" (para florestas, use o Espalhar)");return}n$++,CQ();var K=new t$;for(var H=0;H<X.parts.length;H++){var B=X.parts[H],O=new T0(j$[B.g],x9(B.color||U8().rock));O.position.set(B.x||0,B.y||0,B.z||0),O.scale.set(B.sx||1,B.sy||1,B.sz||1),O.castShadow=!0,K.add(O)}var D=f0(k(W.s,1),0.1,10);K.scale.set(D,D,D);var j=J.world/2-1,v=f0(k(W.x,0),-j,j),S=f0(k(W.z,0),-j,j);if(K.position.set(v,h0(v,S),S),MQ().add(K),X.collR>0)F7(v,S,X.collR*D)}function aW(W){var X=W.indexOf(",");if(X<0)return null;try{var K=atob(W.slice(X+1)),H=K.length,B=new Uint8Array(H);for(var O=0;O<H;O++)B[O]=K.charCodeAt(O);return B.buffer}catch(D){return null}}function W6(W,X){if(!W||!W.dispose)return;try{W.dispose()}catch(K){C$(X,"não consegui liberar uma textura antiga: "+K)}}function rW(){var W=IQ;if(IQ=null,G){if(G.background===W)G.background=null;if(G.environment===W)G.environment=null}W6(W,"dispose-hdr")}function tW(){var W=v5;v5=null,W6(W,"dispose-pending-hdr")}function eW(W){if(!W)return;if(rW(),!G){tW(),v5=W;return}if(x)W6(x,"dispose-gradient-sky"),x=null;G.background=W,G.environment=W,IQ=W}function $1(W){if(!W)return null;var X=W.clone?W.clone():null;if(!X&&W.image)X=new o5(W.image.data,W.image.width,W.image.height);if(!X)return null;if(c6!=null)X.mapping=c6;return X.needsUpdate=!0,X}function aU(W){if(H4){W(H4);return}if(LQ.push(W),LQ.length>1)return;var X=function(K){if(K)H4=K;var H=LQ.slice();LQ.length=0;for(var B=0;B<H.length;B++)H[B](K)};try{Promise.resolve().then(() => (UU(),KU)).then(X,function(K){if(!F)z0("não consegui carregar o leitor de céu: "+K);X(null)})}catch(K){if(!F)z0("não consegui carregar o leitor de céu: "+K);X(null)}}function rU(W,X,K){if(F){K(null);return}if(!K8)K8=Object.create(null);if(K8[W]){K($1(K8[W]));return}if(!l7)l7=Object.create(null);if(l7[W]){l7[W].push(K);return}l7[W]=[K];var H=null;I.push(new Promise(function(j){H=j}));var B=!1,O=function(j){if(B)return;B=!0;var v=l7&&l7[W]?l7[W]:[];if(l7)delete l7[W];for(var S=0;S<v.length;S++)v[S](j&&!F?$1(j):null);if(H)H()},D=aW(X.dataUrl);if(!D){z0('não consegui ler os dados do céu "'+W+'"'),O(null);return}aU(function(j){if(!j||F){O(null);return}try{var v=new j.HDRLoader().parse(D);if(!v||!v.data){O(null);return}var S=new o5(v.data,v.width,v.height);if(v.type!=null)S.type=v.type;if(n9!=null)S.colorSpace=n9;if(w9!=null)S.minFilter=w9,S.magFilter=w9;if(S.generateMipmaps=!1,S.flipY=!0,c6!=null)S.mapping=c6;if(S.needsUpdate=!0,F||!K8){W6(S,"dispose-late-hdr"),O(null);return}K8[W]=S,O(S)}catch(h){z0('não consegui abrir o céu "'+W+'": '+h),O(null)}})}function tU(W){var X=N0(W,""),K=uW[X];if(!K||K.kind!=="environment3d"){z0('o céu "'+X+'" não está no projeto — envie um arquivo .hdr');return}var H=++F4;rU(X,K,function(B){if(!B)return;if(F||H!==F4){W6(B,"dispose-stale-hdr");return}eW(B)})}function eU(W){if(!W||!y||!G||!f)return;try{if(y.compileAsync)y.compileAsync(W,f,G);else if(y.compile)y.compile(G,f)}catch(X){}}function LJ(W,X){if(!W||!W.traverse)return;var K=new Set,H=new Set,B=new Set;try{W.traverse(function(O){if(O.isInstancedMesh&&O.dispose)O.dispose();if(O.geometry)K.add(O.geometry);if(!O.material)return;var D=O.material.length?O.material:[O.material];for(var j=0;j<D.length;j++){var v=D[j];if(!v)continue;if(H.add(v),!X)continue;for(var S in v){var h=v[S];if(h&&h.isTexture)B.add(h)}}}),B.forEach(function(O){if(O.dispose)O.dispose()}),K.forEach(function(O){if(O.dispose)O.dispose()}),H.forEach(function(O){if(O.dispose)O.dispose()})}catch(O){C$("dispose-object-tree","não consegui liberar uma árvore 3D por completo: "+O)}}function J1(W,X){if(F)return null;var K=N0(W,"");if(!K)return z0('escreva o NOME do modelo (o nome dele em "Modelos 3D", no menu de três pontinhos)'),null;if(!u7)u7={};if(u7[K])return u7[K];if(!p7)p7={};if(p7[K]){if(typeof X==="function")p7[K].push(X);return null}var H=uW[K];if(!H||H.kind!=="model3d")return z0('o modelo "'+K+'" não está no projeto. Envie o .glb em "Modelos 3D"'),null;var B=aW(H.dataUrl);if(!B)return null;p7[K]=typeof X==="function"?[X]:[];var O=null;I.push(new Promise(function(S){O=S}));var D=!1,j=function(S){if(D)return;D=!0;var h=p7&&p7[K]?p7[K]:[];if(p7)delete p7[K];if(S&&!F)for(var p=0;p<h.length;p++)try{h[p](S)}catch(c){C$("model-ready-"+K,'erro ao montar o modelo "'+K+'": '+c)}if(O)O()},v=function(S){if(F){j(null);return}q4=S;try{new S.GLTFLoader().parse(B,"",function(h){if(h&&h.scene){if(F||!u7){LJ(h.scene,!0),j(null);return}u7[K]={scene:h.scene},eU(h.scene),j(u7[K])}else z0('o modelo "'+K+'" veio vazio'),j(null)},function(h){z0('não consegui abrir o modelo "'+K+'": '+h),j(null)})}catch(h){z0('não consegui abrir o modelo "'+K+'": '+h),j(null)}};if(q4)return v(q4),null;try{Promise.resolve().then(() => (lU(),pU)).then(v,function(S){z0("não consegui carregar o leitor de modelos: "+S),j(null)})}catch(S){z0("não consegui carregar o leitor de modelos: "+S),j(null)}return null}function Q1(W){var X=[];try{if(W.updateWorldMatrix)W.updateWorldMatrix(!0,!0);W.traverse(function(K){if(K.isMesh&&K.geometry)X.push(K)})}catch(K){}return X}function Z1(W){var X=0;for(var K=0;K<W.length;K++){var H=W[K].geometry;if(!H)continue;if(H.index&&H.index.count!=null)X+=Math.floor(H.index.count/3);else if(H.attributes&&H.attributes.position)X+=Math.floor(H.attributes.position.count/3)}return X}function X1(W){try{if(!l6)return 0;var X=new l6().setFromObject(W),K=X.max.x-X.min.x,H=X.max.z-X.min.z;return Math.sqrt(K*K+H*H)*0.35}catch(B){return 0}}function $q(W){if(!W.model||!W.model.scene||!G)return;var X=Q1(W.model.scene);if(!X.length){z0('o modelo "'+W.name+'" não tem malhas — nada para espalhar');return}if(X.length>O0){z0('o modelo "'+W.name+'" tem '+X.length+" malhas — o máximo para espalhar é "+O0+"; una as peças no editor 3D");return}var K=Z1(X);if(K>n0){z0('o modelo "'+W.name+'" tem triângulos demais para este mundo ('+K+" > "+n0+")");return}var H=Math.floor(f0(k(W.n,0),1,500)),B=K>0?Math.max(1,Math.floor(I$/K)):H,O=iW(Math.min(H,B),X.length);if(H>B)C$("model-triangle-budget-"+W.name,'o modelo "'+W.name+'" é detalhado — espalhei só '+B+" cópias para manter o desempenho");if(O<=0)return;var D=f0(k(W.s,1),0.05,20),j=sW(W,O,D*0.9,D*1.15);if(!j.length)return;P0+=j.length*X.length,m9();var v=MQ();for(var S=0;S<X.length;S++){var h=X[S],p=new r$(h.geometry,h.material,j.length);p.castShadow=!0;for(var c=0;c<j.length;c++){var $0=j[c];q0.position.set($0.x,h0($0.x,$0.z),$0.z),q0.rotation.set(0,$0.yaw,0),q0.scale.set($0.s,$0.s,$0.s),q0.updateMatrix(),X6.multiplyMatrices(q0.matrix,h.matrixWorld),p.setMatrixAt(c,X6)}if(p.instanceMatrix)p.instanceMatrix.needsUpdate=!0;v.add(p)}var H0=X1(W.model.scene);if(H0>0.35)for(var E0=0;E0<j.length;E0++)F7(j[E0].x,j[E0].z,H0*j[E0].s)}function Jq(W){if(!W.model||!W.model.scene||!G)return;if(n$>=l$){C$("placed-max",'muitos "Pôr" — o teto é '+l$);return}var X=Q1(W.model.scene),K=Z1(X);if(K>n0){z0('o modelo "'+W.name+'" tem triângulos demais para este mundo ('+K+" > "+n0+")");return}n$++;var H=W.model.scene.clone();try{H.traverse(function(S){if(S.isMesh)S.castShadow=!0})}catch(S){}var B=f0(k(W.s,1),0.05,20);H.scale.set(B,B,B);var O=J.world/2-1,D=f0(k(W.x,0),-O,O),j=f0(k(W.z,0),-O,O);H.position.set(D,h0(D,j),j),H.rotation.y=k(W.deg,0)*Math.PI/180,MQ().add(H);var v=X1(W.model.scene);if(v>0.35)F7(D,j,v*B)}function w5(W){if(W.built)return;if(W.kind==="species")W.built=!0,sU(W);else if(W.kind==="placeSpecies")W.built=!0,iU(W);else if(W.kind==="model"||W.kind==="placeModel"){if(!W.model)return;if(W.built=!0,W.kind==="model")$q(W);else Jq(W)}}function Qq(){for(var W=0;W<m.length;W++)w5(m[W])}function Zq(){if(s9>0)return;s9=0.4;for(var W=0;W<Z7.length;W++)try{Z7[W]()}catch(X){C$("hook-crash-"+W,'erro no "Quando o carrinho bater forte": '+X)}}var IJ=4,Xq=["varying vec2 vUvs;","void main() {","  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);","  vUvs = uv;","}"].join(" "),Wq=["uniform sampler2D tDiffuse;","varying vec2 vUvs;","void main() { gl_FragColor = texture2D(tDiffuse, vUvs); }"].join(" "),Yq=["uniform sampler2D frameTexture;","uniform bool useKaris;","uniform vec2 resolution;","varying vec2 vUvs;","float Luminance(vec4 c) { return max(1.0, dot(c.xyz, vec3(0.2627, 0.6780, 0.0593))); }","vec4 KarisAverage(vec4 s1, vec4 s2, vec4 s3, vec4 s4) {","  float w1 = 1.0 / Luminance(s1);","  float w2 = 1.0 / Luminance(s2);","  float w3 = 1.0 / Luminance(s3);","  float w4 = 1.0 / Luminance(s4);","  float totalWeight = 1.0 / (w1 + w2 + w3 + w4);","  return (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4) * totalWeight;","}","void main() {","  vec2 texelSize = 1.0 / resolution;","  vec4 A = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, -1.0));","  vec4 B = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, -1.0));","  vec4 C = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, -1.0));","  vec4 D = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, -0.5));","  vec4 E = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, -0.5));","  vec4 F = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 0.0));","  vec4 G = texture2D(frameTexture, vUvs);","  vec4 H = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 0.0));","  vec4 I = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, 0.5));","  vec4 J = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, 0.5));","  vec4 K = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 1.0));","  vec4 L = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, 1.0));","  vec4 M = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 1.0));","  vec2 div = vec2(0.5, 0.125);","  vec4 colour = vec4(0.0);","  if (useKaris) {","    colour = KarisAverage(D, E, I, J) * div.x;","    colour += KarisAverage(A, B, G, F) * div.y;","    colour += KarisAverage(B, C, H, G) * div.y;","    colour += KarisAverage(F, G, L, K) * div.y;","    colour += KarisAverage(G, H, M, L) * div.y;","  } else {","    div *= 0.25;","    colour = (D + E + I + J) * div.x;","    colour += (A + B + G + F) * div.y;","    colour += (B + C + H + G) * div.y;","    colour += (F + G + L + K) * div.y;","    colour += (G + H + M + L) * div.y;","  }","  gl_FragColor = colour;","}"].join(" "),Vq=["uniform sampler2D frameTexture;","uniform sampler2D mipTexture;","uniform vec2 resolution;","varying vec2 vUvs;","void main() {","  float x = 1.0 / resolution.x;","  float y = 1.0 / resolution.y;","  vec4 a = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y + y));","  vec4 b = texture2D(frameTexture, vec2(vUvs.x, vUvs.y + y));","  vec4 c = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y + y));","  vec4 d = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y));","  vec4 e = texture2D(frameTexture, vec2(vUvs.x, vUvs.y));","  vec4 f = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y));","  vec4 g = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y - y));","  vec4 h = texture2D(frameTexture, vec2(vUvs.x, vUvs.y - y));","  vec4 i = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y - y));","  vec4 colour = e * 4.0;","  colour += (b + d + f + h) * 2.0;","  colour += (a + c + g + i);","  colour *= 1.0 / 16.0;","  colour += texture2D(mipTexture, vUvs);","  gl_FragColor = colour;","}"].join(" "),Kq=["uniform sampler2D frameTexture;","uniform sampler2D bloomTexture;","uniform float bloomStrength;","uniform float bloomMix;","varying vec2 vUvs;","void main() {","  vec4 textureSample = texture2D(frameTexture, vUvs);","  vec4 bloomSample = texture2D(bloomTexture, vUvs);","  gl_FragColor = mix(textureSample, bloomStrength * bloomSample, bloomMix);","}"].join(" "),Uq=["uniform sampler2D tDiffuse;","uniform float intensity;","uniform float dropoff;","varying vec2 vUvs;","float inverseLerp(float v, float minValue, float maxValue) {","  return (v - minValue) / (maxValue - minValue);","}","float remap(float v, float inMin, float inMax, float outMin, float outMax) {","  float t = inverseLerp(v, inMin, inMax);","  return mix(outMin, outMax, t);","}","float vignette(vec2 uvs) {","  float v1 = smoothstep(0.5, 0.3, abs(uvs.x - 0.5));","  float v2 = smoothstep(0.5, 0.3, abs(uvs.y - 0.5));","  float v = v1 * v2;","  v = pow(v, dropoff);","  v = remap(v, 0.0, 1.0, intensity, 1.0);","  return v;","}","vec3 RRTAndODTFit(vec3 v) {","  vec3 a = v * (v + 0.0245786) - 0.000090537;","  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;","  return a / b;","}","vec3 aces(vec3 color) {","  mat3 mIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);","  mat3 mOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);","  color *= 1.0 / 0.6;","  color = mIn * color;","  color = RRTAndODTFit(color);","  color = mOut * color;","  return clamp(color, 0.0, 1.0);","}","void main() {","  vec4 texel = texture2D(tDiffuse, vUvs);","  vec3 col = texel.xyz * vignette(vUvs);","  col = aces(col);","  col = pow(col, vec3(0.4545));","  gl_FragColor = vec4(col, 1.0);","}"].join(" ");function I4(W,X){return new sZ(Math.max(1,Math.round(W)),Math.max(1,Math.round(X)),{type:c8,magFilter:w9,minFilter:w9,wrapS:d6,wrapT:d6,generateMipmaps:!1,depthBuffer:!1,stencilBuffer:!1})}function DJ(W,X){return new n8({uniforms:X,vertexShader:Xq,fragmentShader:W,depthTest:!1,depthWrite:!1})}function qq(){if(m7||N4)return;try{var W=new cZ,X=new tJ(-1,1,1,-1,0,1),K=new L7(2,2),H=new T0(K,null);W.add(H);var B=new sZ(J.w,J.h,{type:c8,magFilter:w9,minFilter:w9,depthBuffer:!0,stencilBuffer:!1}),O=I4(J.w,J.h),D=[null],j=[null];for(var v=1;v<=IJ;v++){var S=Math.pow(2,v);D.push(I4(J.w/S,J.h/S)),j.push(I4(J.w/S,J.h/S))}var h=DJ(Wq,{tDiffuse:{value:null}}),p=DJ(Yq,{frameTexture:{value:null},useKaris:{value:!1},resolution:{value:new P5(1,1)}}),c=DJ(Vq,{frameTexture:{value:null},mipTexture:{value:null},resolution:{value:new P5(1,1)}}),$0=DJ(Kq,{frameTexture:{value:null},bloomTexture:{value:null},bloomStrength:{value:J.bloomStrength},bloomMix:{value:0.08}}),H0=DJ(Uq,{tDiffuse:{value:null},intensity:{value:0.35},dropoff:{value:0.35}});m7={quadScene:W,quadCam:X,quadGeo:K,quadMesh:H,rtScene:B,rtGrade:O,down:D,up:j,matCopy:h,matDown:p,matUp:c,matComposite:$0,matFinal:H0}}catch(E0){N4=!0,m7=null,z0("efeitos de cinema indisponíveis neste computador — seguindo sem eles: "+E0)}}function PJ(W,X){m7.quadMesh.material=W,y.setRenderTarget(X),y.render(m7.quadScene,m7.quadCam)}function Hq(){var W=m7;if(pZ!=null)y.toneMapping=pZ;y.setRenderTarget(W.rtScene),y.render(G,f);var X=W.rtScene;if(J.bloom){var K=W.rtScene;for(var H=1;H<=IJ;H++)W.matDown.uniforms.frameTexture.value=K.texture,W.matDown.uniforms.useKaris.value=H===1,W.matDown.uniforms.resolution.value.set(K.width,K.height),PJ(W.matDown,W.down[H]),K=W.down[H];W.matCopy.uniforms.tDiffuse.value=W.down[IJ].texture,PJ(W.matCopy,W.up[IJ]);for(var B=IJ-1;B>=1;B--)W.matUp.uniforms.frameTexture.value=W.up[B+1].texture,W.matUp.uniforms.mipTexture.value=W.down[B+1].texture,W.matUp.uniforms.resolution.value.set(W.up[B+1].width,W.up[B+1].height),PJ(W.matUp,W.up[B]);W.matComposite.uniforms.frameTexture.value=W.rtScene.texture,W.matComposite.uniforms.bloomTexture.value=W.up[1].texture,W.matComposite.uniforms.bloomStrength.value=J.bloomStrength,PJ(W.matComposite,W.rtGrade),X=W.rtGrade}W.matFinal.uniforms.tDiffuse.value=X.texture,W.matFinal.uniforms.intensity.value=J.vignette?0.35:1,PJ(W.matFinal,null)}function Fq(){var W=m7;if(!W)return;m7=null;try{var X=[W.rtScene,W.rtGrade].concat(W.down.slice(1)).concat(W.up.slice(1));for(var K=0;K<X.length;K++)if(X[K]&&X[K].dispose)X[K].dispose();var H=[W.matCopy,W.matDown,W.matUp,W.matComposite,W.matFinal];for(var B=0;B<H.length;B++)if(H[B]&&H[B].dispose)H[B].dispose();if(W.quadGeo&&W.quadGeo.dispose)W.quadGeo.dispose()}catch(O){}}function Bq(){var W=(J.bloom||J.vignette)&&K9.tier!=="turbo";if(W&&!N4){if(!m7)qq();if(m7){if(k$)k$.uniforms.uGamma.value=1;Hq();return}}if(k$)k$.uniforms.uGamma.value=0.4545;if(p6!=null)y.toneMapping=p6;y.setRenderTarget(null),y.render(G,f)}var Nq=["uniform float uTime;","uniform float uWind;","uniform vec2 uCenter;","uniform float uRadius;","uniform sampler2D uHeight;","uniform float uHMin;","uniform float uHRange;","uniform float uWorld;","attribute vec2 aOffset;","attribute float aRand;","varying float vY;","varying float vRand;","varying float vFade;","void main() {","  float span = uRadius * 2.0;","  vec2 wp = uCenter + mod(aOffset - uCenter, vec2(span)) - vec2(uRadius);","  vec2 dc = wp - uCenter;","  float dist = length(dc);","  float fade = 1.0 - smoothstep(uRadius * 0.72, uRadius * 0.98, dist);","  float half2 = uWorld * 0.5 - 1.5;","  if (abs(wp.x) > half2 || abs(wp.y) > half2) fade = 0.0;","  vec2 huv = (wp + vec2(uWorld * 0.5)) / uWorld;","  float gh = uHMin + texture2D(uHeight, huv).r * uHRange;","  float ang = aRand * 6.2831853;","  float ca = cos(ang);","  float sa = sin(ang);","  vec3 pos = position;","  float h = 0.42 + aRand * 0.35;","  pos.y *= h;","  pos = vec3(pos.x * ca, pos.y, pos.x * sa);","  float sway = sin(uTime * 1.6 + wp.x * 0.35 + wp.y * 0.27 + aRand * 6.28) * (0.1 + uWind * 0.22);","  float bend = (pos.y * pos.y) / max(h * h, 0.0001);","  pos.x += sway * bend;","  pos.z += sway * bend * 0.6;","  pos *= fade;","  vec3 world = vec3(wp.x, gh, wp.y) + pos;","  vY = position.y;","  vRand = aRand;","  vFade = dist / max(uRadius, 0.001);","  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);","}"].join(" "),Oq=["uniform vec3 uColorA;","uniform vec3 uColorB;","uniform vec3 uFog;","uniform float uGamma;","uniform float uNight;","varying float vY;","varying float vRand;","varying float vFade;","void main() {","  vec3 col = mix(uColorA, uColorB, clamp(vY, 0.0, 1.0));","  col *= 0.92 + vRand * 0.16;","  col = mix(col, col * vec3(0.5, 0.55, 0.75), uNight);","  col = mix(col, uFog, smoothstep(0.7, 1.0, vFade) * 0.6);","  col = pow(col, vec3(uGamma));","  gl_FragColor = vec4(col, 1.0);","}"].join(" ");function q8(){var W=128,X=new Uint8Array(W*W),K=new Float32Array(W*W),H=1/0,B=-1/0;for(var O=0;O<W;O++)for(var D=0;D<W;D++){var j=(D/(W-1)-0.5)*J.world,v=(O/(W-1)-0.5)*J.world,S=h0(j,v);if(K[O*W+D]=S,S<H)H=S;if(S>B)B=S}H-=0.25,B+=0.25;var h=Math.max(0.5,B-H);for(var p=0;p<K.length;p++){var c=(K[p]-H)/h;if(c<0)c=0;if(c>1)c=1;X[p]=Math.round(c*255)}if(R7&&R7.dispose)try{R7.dispose()}catch($0){}if(R7=new o5(X,W,W,i6),w9)R7.minFilter=w9,R7.magFilter=w9;if(R7.needsUpdate=!0,k$)k$.uniforms.uHeight.value=R7,k$.uniforms.uHMin.value=H,k$.uniforms.uHRange.value=h}var D4={pouca:8000,media:16000,muita:24000};function P4(){if(!G||!PQ)return;if(c7){try{if(G.remove(c7),c7.geometry&&c7.geometry.dispose)c7.geometry.dispose()}catch($0){}c7=null}if(!yZ||!L5||!n8)return;var W=U8(),X=Math.round((D4[PQ.amount]||D4.media)*(W.grassK!=null?W.grassK:1)),K=55;if(K9.tier==="turbo")X=Math.round(X/3),K=35;if(X<=0)return;var H=new L7(0.14,1,1,2);H.translate(0,0.5,0);var B=new yZ;B.index=H.index,B.setAttribute("position",H.attributes.position),B.setAttribute("uv",H.attributes.uv);var O=H7(777),D=K*2,j=new Float32Array(X*2),v=new Float32Array(X);for(var S=0;S<X;S++)j[S*2]=O()*D,j[S*2+1]=O()*D,v[S]=O();if(B.setAttribute("aOffset",new L5(j,2)),B.setAttribute("aRand",new L5(v,1)),B.instanceCount=X,!k$){var h=new y$(W.grass[0]),p=new y$(W.grass[1]),c=new y$(W.fog);k$=new n8({uniforms:{uTime:{value:0},uWind:{value:z5},uCenter:{value:new P5(0,0)},uRadius:{value:K},uHeight:{value:null},uHMin:{value:0},uHRange:{value:1},uWorld:{value:J.world},uColorA:{value:new M9(h.r,h.g,h.b)},uColorB:{value:new M9(p.r,p.g,p.b)},uFog:{value:new M9(c.r,c.g,c.b)},uGamma:{value:1},uNight:{value:0}},vertexShader:Nq,fragmentShader:Oq,side:m8!=null?m8:2})}else k$.uniforms.uRadius.value=K,k$.uniforms.uWorld.value=J.world;q8(),c7=new T0(B,k$),c7.frustumCulled=!1,G.add(c7)}var Z5=[{t:0,top:"#0b1230",bot:"#1a2342",mix:0.92,sun:"#8fa8ff",sunI:0.12,amb:0.22,stars:1},{t:6,top:"#f4b46a",bot:"#ffe4b8",mix:0.55,sun:"#ffd9a8",sunI:0.75,amb:0.5,stars:0},{t:12,top:"",bot:"",mix:0,sun:"#ffffff",sunI:1.05,amb:0.6,stars:0},{t:18,top:"#f4844d",bot:"#ffd2a0",mix:0.6,sun:"#ffb066",sunI:0.6,amb:0.45,stars:0},{t:24,top:"#0b1230",bot:"#1a2342",mix:0.92,sun:"#8fa8ff",sunI:0.12,amb:0.22,stars:1}],o7=null,B7=null,z8=null;function Lq(){if(!o7)o7=new y$,B7=new y$,z8=new y$}var X5={top:"",bot:"",sunI:1,amb:0.6,stars:0,sun:"#ffffff",fog:""};function Iq(W){var X=U8(),K=Z5[0],H=Z5[Z5.length-1];for(var B=0;B<Z5.length-1;B++)if(W>=Z5[B].t&&W<=Z5[B+1].t){K=Z5[B],H=Z5[B+1];break}var O=(W-K.t)/Math.max(0.001,H.t-K.t);Lq();var D=K.mix,j=H.mix,v=D+(j-D)*O;return o7.set(X.skyTop),B7.set(K.top||X.skyTop),z8.set(H.top||X.skyTop),B7.lerp(z8,O),o7.lerp(B7,v),X5.top="#"+o7.getHexString(),o7.set(X.skyBot),B7.set(K.bot||X.skyBot),z8.set(H.bot||X.skyBot),B7.lerp(z8,O),o7.lerp(B7,v),X5.bot="#"+o7.getHexString(),o7.set(X.fog),B7.set(K.top||X.fog),z8.set(H.top||X.fog),B7.lerp(z8,O),o7.lerp(B7,v*0.8),X5.fog="#"+o7.getHexString(),B7.set(K.sun),z8.set(H.sun),B7.lerp(z8,O),X5.sun="#"+B7.getHexString(),X5.sunI=K.sunI+(H.sunI-K.sunI)*O,X5.amb=K.amb+(H.amb-K.amb)*O,X5.stars=K.stars+(H.stars-K.stars)*O,X5}function Dq(W,X){if(!G)return;if(IQ||v5)return;try{if(!T5)T5=document.createElement("canvas"),T5.width=2,T5.height=256;var K=T5.getContext("2d");if(!K)return;var H=K.createLinearGradient(0,0,0,256);if(H.addColorStop(0,W),H.addColorStop(1,X),K.fillStyle=H,K.fillRect(0,0,2,256),x&&x.image===T5)x.needsUpdate=!0;else{if(x&&x.dispose)try{x.dispose()}catch(B){}x=new l8(T5),G.background=x}}catch(B){}}function Pq(){if(S5||!G)return;try{var W=350,X=H7(99),K=new Float32Array(W*3),H=Math.max(300,J.world*2);for(var B=0;B<W;B++){var O=X()*Math.PI*2,D=0.12+X()*1.35;K[B*3]=Math.cos(O)*Math.cos(D)*H,K[B*3+1]=Math.sin(D)*H,K[B*3+2]=Math.sin(O)*Math.cos(D)*H}var j=new p9;j.setAttribute("position",new z9(K,3)),k5=new w7({color:"#ffffff",size:2.2,sizeAttenuation:!1,transparent:!0,opacity:0,depthWrite:!1}),S5=new z7(j,k5),S5.frustumCulled=!1,G.add(S5)}catch(v){}}function vQ(){if(!U)return;var W=Iq(d7);if(Math.abs(d7-OJ)>0.05){if(OJ=d7,Dq(W.top,W.bot),G.fog&&G.fog.color)try{G.fog.color.set(W.fog)}catch(O){}if(d){d.intensity=W.sunI;try{d.color.set(W.sun)}catch(O){}}if(b)b.intensity=W.amb}if(W.stars>0.01){if(Pq(),k5)k5.opacity=W.stars;if(S5){var X=e9();S5.position.set(X.x,0,X.z)}}else if(k5)k5.opacity=0;a9=W.stars;var K=d7>=6&&d7<18?"dia":"noite";if(B4&&K!==B4){var H=pW[K]||[];for(var B=0;B<H.length;B++)try{H[B]()}catch(O){C$("hook-day-"+K+"-"+B,'erro no "Quando virar '+K+'": '+O)}}B4=K}function Gq(W){if(!DQ.on)return;var X=Math.max(10,DQ.minutes*60);d7=(d7+W/X*24)%24,vQ()}function _5(){if(T8)return T8;try{var W=document.createElement("canvas");W.width=32,W.height=32;var X=W.getContext("2d");if(!X)return null;var K=X.createRadialGradient(16,16,2,16,16,15);K.addColorStop(0,"rgba(255,255,255,1)"),K.addColorStop(1,"rgba(255,255,255,0)"),X.fillStyle=K,X.fillRect(0,0,32,32),T8=new l8(W)}catch(H){T8=null}return T8}var W1={chuva:{color:"#9fb4cc",size:1.1,vy:-24,drift:2,n:900},neve:{color:"#ffffff",size:1.6,vy:-2.4,drift:1.6,n:700},folhas:{color:"#d9822b",size:1.8,vy:-1.4,drift:3.2,n:350},tempestade:{color:"#8aa3c4",size:1.1,vy:-34,drift:3.4,n:1200}},j7=42,Y1=26;function V1(){if(!Y7)return;try{if(G)G.remove(Y7.mesh);if(Y7.geo&&Y7.geo.dispose)Y7.geo.dispose();if(Y7.mat&&Y7.mat.dispose)Y7.mat.dispose()}catch(W){}Y7=null}function AQ(){if(V1(),!G||A8==="limpo")return;var W=W1[A8];if(!W)return;var X=K9.tier==="turbo"?Math.round(W.n/3):W.n,K=H7(555),H=new Float32Array(X*3),B=new Float32Array(X*2),O=e9(),D=O.x,j=O.z;for(var v=0;v<X;v++)H[v*3]=D+(K()*2-1)*j7,H[v*3+1]=K()*Y1,H[v*3+2]=j+(K()*2-1)*j7,B[v*2]=K()*Math.PI*2,B[v*2+1]=0.6+K()*0.8;var S=new p9;S.setAttribute("position",new z9(H,3));var h=new w7({color:W.color,size:W.size,sizeAttenuation:!0,transparent:!0,opacity:0.85,depthWrite:!1}),p=_5();if(p)h.map=p;var c=new z7(S,h);c.frustumCulled=!1,G.add(c),Y7={mesh:c,mat:h,geo:S,pos:H,vel:B,n:X,spec:W}}function Eq(W){if(!Y7)return;var X=Y7,K=e9(),H=K.x,B=K.z,O=r;for(var D=0;D<X.n;D++){var j=D*3;X.pos[j+1]+=X.spec.vy*X.vel[D*2+1]*W;var v=X.vel[D*2];X.pos[j]+=Math.sin(O*1.3+v)*X.spec.drift*z5*W,X.pos[j+2]+=Math.cos(O*1.1+v)*X.spec.drift*z5*0.7*W;var S=0;if(X.pos[j+1]<(S=h0(X.pos[j],X.pos[j+2])))X.pos[j]=H+(Math.random()*2-1)*j7,X.pos[j+1]=S+Y1*(0.7+Math.random()*0.3),X.pos[j+2]=B+(Math.random()*2-1)*j7;else{if(X.pos[j]<H-j7)X.pos[j]+=j7*2;else if(X.pos[j]>H+j7)X.pos[j]-=j7*2;if(X.pos[j+2]<B-j7)X.pos[j+2]+=j7*2;else if(X.pos[j+2]>B+j7)X.pos[j+2]-=j7*2}}if(X.geo.attributes.position)X.geo.attributes.position.needsUpdate=!0}function K1(W){if(K9.tier=W==="turbo"?"turbo":"alta",y)y.setPixelRatio(K9.tier==="turbo"?0.75:1);if(d&&d.shadow)try{var X=K9.tier==="turbo"?1024:2048;if(d.shadow.mapSize&&d.shadow.mapSize.set)d.shadow.mapSize.set(X,X);if(d.shadow.map)d.shadow.map.dispose(),d.shadow.map=null}catch(K){C$("quality-shadow","não consegui reajustar a sombra: "+K)}if(c7)P4();if(Y7)AQ()}function U1(){if(K9.tier==="turbo")return;z0("modo turbo ligado: este computador pediu um mundo mais leve (menos grama, sombra menor, sem efeitos de cinema)"),K1("turbo")}var Rq=["uniform float uTime;","varying vec2 vWorld;","void main() {","  vec4 wp = modelMatrix * vec4(position, 1.0);","  float wave = sin(wp.x * 0.25 + uTime * 1.2) * 0.12 + cos(wp.z * 0.3 + uTime) * 0.1;","  wp.y += wave;","  vWorld = wp.xz;","  gl_Position = projectionMatrix * viewMatrix * wp;","}"].join(" "),jq=["uniform vec3 uColor;","uniform float uTime;","uniform sampler2D uFoamTex;","uniform float uHalf;","uniform float uWaterY;","uniform float uHasFoam;","varying vec2 vWorld;","void main() {","  float spark = 0.5 + 0.5 * sin(vWorld.x * 0.8 + uTime * 2.0) * cos(vWorld.y * 0.7 - uTime * 1.5);","  vec3 col = uColor + spark * 0.08;","  if (uHasFoam > 0.5) {","    float h = texture2D(uFoamTex, vWorld / (uHalf * 2.0) + 0.5).r * 40.0 - 10.0;","    float depth = uWaterY - h;","    float band = 0.55 + 0.14 * sin(vWorld.x * 1.7 + uTime * 1.8) + 0.1 * cos(vWorld.y * 2.3 - uTime * 1.3);","    float foam = (1.0 - smoothstep(0.03, band, depth)) * step(0.0, depth);","    col = mix(col, vec3(0.96, 0.98, 1.0), foam * 0.75);","  }","  gl_FragColor = vec4(col, 0.82);","}"].join(" ");function H8(){if(!F0)return;var W=64,X=new Uint8Array(W*W),K=J.world/2;for(var H=0;H<W;H++)for(var B=0;B<W;B++){var O=B/(W-1)*J.world-K,D=H/(W-1)*J.world-K,j=h0(O,D);X[H*W+B]=Math.round(f0((j+10)/40,0,1)*255)}if(s8)try{s8.dispose()}catch(v){}s8=new o5(X,W,W,i6?i6:void 0),s8.needsUpdate=!0,F0.uniforms.uFoamTex.value=s8,F0.uniforms.uHalf.value=K,F0.uniforms.uWaterY.value=J0?J0.y:0,F0.uniforms.uHasFoam.value=1}function G4(){if(!G||!J0)return;if(K0){try{if(G.remove(K0),K0.geometry&&K0.geometry.dispose)K0.geometry.dispose()}catch(K){}K0=null}if(!n8)return;var W=new L7(J.world*1.4,J.world*1.4,40,40);if(W.rotateX(-Math.PI/2),!F0){var X=new y$(J0.color);F0=new n8({uniforms:{uTime:{value:0},uColor:{value:new M9(X.r,X.g,X.b)},uFoamTex:{value:null},uHalf:{value:J.world/2},uWaterY:{value:J0.y},uHasFoam:{value:0}},vertexShader:Rq,fragmentShader:jq,transparent:!0})}K0=new T0(W,F0),K0.position.y=J0.y,K0.frustumCulled=!1,G.add(K0);try{H8()}catch(K){F0.uniforms.uHasFoam.value=0}}function TQ(){if(p0)return p0;if(!e0)return null;try{var W=window.AudioContext||window.webkitAudioContext;if(W)p0=new W}catch(X){p0=null}return p0}function SQ(){e0=!0;try{if(p0&&p0.state==="suspended")p0.resume()}catch(W){}if(x0&&!z$)q1();if(t8==="mar"&&!e8)e1()}function q1(){var W=TQ();if(!W||z$)return;try{z$=W.createOscillator(),M$=W.createGain(),B0=W.createBiquadFilter(),z$.type="sawtooth",z$.frequency.value=60,B0.type="lowpass",B0.frequency.value=500,M$.gain.value=0,z$.connect(B0),B0.connect(M$),M$.connect(W.destination),z$.start()}catch(X){z$=null}}function Cq(){if(!x0||!z$||!n)return;var W=p0;if(!W)return;var X=V0?k(V0.speed,22):22,K=Math.min(1,Math.abs(n.speed)/Math.max(1,X));try{z$.frequency.setTargetAtTime(55+K*130,W.currentTime,0.08),B0.frequency.setTargetAtTime(400+K*1800,W.currentTime,0.08),M$.gain.setTargetAtTime(0.04+K*0.06,W.currentTime,0.1)}catch(H){}}function H1(W){var X=N0(W,"");if(w0[X])return w0[X];var K=OQ[X];if(!K)return null;try{var H=new Audio(K);return H.preload="auto",w0[X]=H,H}catch(B){return null}}var Mq={"topo-esquerda":1,"topo-direita":1,"baixo-esquerda":1,"baixo-direita":1},vq={"topo-esquerda":"top:12px;left:12px","topo-direita":"top:12px;right:12px","baixo-esquerda":"bottom:12px;left:12px","baixo-direita":"bottom:12px;right:12px"};function F1(W,X){if(!K6())return;var K=N0(W,"topo-esquerda");if(!Mq[K])K="topo-esquerda";var H=N0(X,""),B=N$[K];if(!H){if(B&&B.parentNode)B.parentNode.removeChild(B);delete N$[K];return}if(!B)B=document.createElement("div"),B.className="szw3d-hud",B.setAttribute("style","position:absolute;"+vq[K]+";color:#fff;font:700 20px var(--sz-game-ui-font);text-shadow:0 2px 6px rgba(0,0,0,.6);pointer-events:none;z-index:6"),M.appendChild(B),N$[K]=B;B.textContent=H}function B1(W,X){if(!K6())return;if(!X$)X$=document.createElement("div"),X$.setAttribute("style","position:absolute;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.92);color:#123;font:600 15px var(--sz-game-ui-font);transform:translate(-50%,-100%);white-space:nowrap;pointer-events:none;z-index:7;box-shadow:0 4px 12px rgba(0,0,0,.3)"),M.appendChild(X$);X$.textContent=N0(W,""),X$.style.display="block",I9=r+Math.max(0.5,k(X,2))}function Aq(){if(!X$)return;if(r>I9){X$.style.display="none";return}if(!f||!y||!E9)return;var W=e9();E9.set(W.x,W.y+2.2,W.z),E9.project(f);var X=A.getBoundingClientRect(),K=(E9.x*0.5+0.5)*X.width,H=(-E9.y*0.5+0.5)*X.height;X$.style.left=K+"px",X$.style.top=H+"px",X$.style.display=E9.z<1?"block":"none"}var E9=null;function Y6(){if(!F9&&G)F9=new t$,G.add(F9);return F9}function N1(W,X){try{var K=document.createElement("canvas");K.width=256,K.height=256;var H=K.getContext("2d");if(!H)return null;H.fillStyle="#fdf6e3",H.fillRect(0,0,256,256),H.fillStyle="#8a6d3b",H.fillRect(0,0,256,10),H.fillRect(0,246,256,10),H.fillStyle="#3a2f1b",H.font="bold 26px "+$,H.textAlign="center",H.fillText(N0(W,""),128,48,240),H.font="18px "+$;var B=N0(X,"").split(" "),O="",D=92;for(var j=0;j<B.length;j++){var v=O?O+" "+B[j]:B[j];if(H.measureText(v).width>224&&O){if(H.fillText(O,128,D,240),O=B[j],D+=26,D>232)break}else O=v}if(O&&D<=232)H.fillText(O,128,D,240);return new l8(K)}catch(S){return null}}function kQ(W,X,K,H){if(!G)return;var B=Y6(),O=h0(W,X),D=new T0(new Q9(0.12,0.12,2.4,6),Q$({color:"#6b4226"}));D.position.set(W,O+1.2,X),D.castShadow=!0,B.add(D);var j=N1(K,H),v=j?new Y9({map:j}):Q$({color:"#fdf6e3"}),S=new T0(new X9(1.8,1.8,0.12),v);S.position.set(W,O+3.1,X),S.castShadow=!0,B.add(S)}function E4(W,X,K,H){if(!G)return;var B=Y6(),O=h0(W,X),D=f0(k(H,3),0.5,20),j=D*0.7,v=new T0(new Q9(0.14,0.14,O>-100?2:2,6),Q$({color:"#5a4632"}));v.position.set(W,O+1,X),v.castShadow=!0,B.add(v);var S=new T0(new X9(D+0.3,j+0.3,0.16),Q$({color:"#3a2f1b"}));S.position.set(W,O+2+j/2,X),S.castShadow=!0,B.add(S);var h=Tq(K),p=h?new Y9({map:h}):Q$({color:"#8892a0"}),c=new T0(new L7(D,j),p);return c.position.set(W,O+2+j/2,X+0.1),B.add(c),{x:W,z:X,image:K}}var V6=null;function Tq(W){var X=N0(W,"");if(!X)return null;if(!V6)V6={};if(V6[X])return V6[X];var K=U4[X];if(!K)return C$("img:"+X,'a imagem "'+X+'" não está no projeto'),null;try{var H=new t6,B=new Image;if(B.onload=function(){H.image=B,H.needsUpdate=!0},B.src=K,I8)H.colorSpace=I8;return V6[X]=H,H}catch(O){return null}}function R4(W,X,K){var H={name:N0(W,""),x:k(X,0),z:k(K,0),r:4};if(f$.push(H),!G)return;var B=Y6(),O=h0(H.x,H.z),D=Q$({color:"#22d3ee"});if(D.emissive)try{D.emissive.set("#0891b2")}catch(v){}var j=new T0(new Q9(0.18,0.28,1.6,7),D);j.position.set(H.x,O+0.8,K),B.add(j),H.marker=j}function O1(W,X,K,H){L$.push({name:N0(W,""),x:k(X,0),z:k(K,0),r:f0(k(H,6),0.5,200),inside:!1})}function Sq(W){var X=q$[W]||[];for(var K=0;K<X.length;K++)try{X[K]()}catch(H){C$("hook-point-"+W+"-"+K,'erro no "Quando apertar E no ponto '+W+'": '+H)}}function kq(W){var X=i0[W]||[];for(var K=0;K<X.length;K++)try{X[K]()}catch(H){C$("hook-zone-"+W+"-"+K,'erro no "Quando entrar na área '+W+'": '+H)}}function zq(){if(!U)return;if(UQ){if(R9("e"))FY();L1(null);return}var W=e9(),X=W.x,K=W.z,H=null,B=1/0,O=-1/0,D="E",j=null;for(var v=0;v<f$.length;v++){var S=f$[v],h=X-S.x,p=K-S.z,c=h*h+p*p;if(c<S.r*S.r&&(O<0||c<B))B=c,H=S,O=0,D="E",j=null;if(S.marker)S.marker.rotation.y+=Q0*1.5}for(var $0=0;$0<S$.length;$0++){var H0=S$[$0],E0=X-H0.x,M0=K-H0.z,m0=E0*E0+M0*M0,Z$=H0.prio||0;if(m0<H0.r*H0.r&&(Z$>O||Z$===O&&m0<B))B=m0,H=H0,O=Z$,D=H0.label||"E",j=H0.fire||null}if(L1(H,D),H&&R9("e"))if(j)try{j()}catch(h$){C$("interact-fire","erro no interagir: "+h$)}else Sq(H.name);for(var y0=0;y0<L$.length;y0++){var u0=L$[y0],V$=X-u0.x,v$=K-u0.z,K$=V$*V$+v$*v$<u0.r*u0.r;if(K$&&!u0.inside)kq(u0.name);u0.inside=K$}}function L1(W,X){if(!W){if(b$)b$.style.display="none";return}if(!K6())return;if(!b$)b$=document.createElement("div"),b$.setAttribute("style","position:absolute;padding:4px 10px;border-radius:10px;background:#22d3ee;color:#04252b;font:800 15px var(--sz-game-ui-font);transform:translate(-50%,-100%);pointer-events:none;z-index:7;box-shadow:0 3px 10px rgba(0,0,0,.35)"),b$.textContent="E",M.appendChild(b$);if(b$.textContent=X||"E",!f||!y||!E9)return;if(E9.set(W.x,typeof W.promptY==="number"?W.promptY:h0(W.x,W.z)+2.4,W.z),E9.project(f),E9.z>=1){b$.style.display="none";return}var K=A.getBoundingClientRect();b$.style.left=(E9.x*0.5+0.5)*K.width+"px",b$.style.top=(-E9.y*0.5+0.5)*K.height+"px",b$.style.display="block"}function I1(W,X){t9.push({kind:"flatten",x:k(W,0),z:k(X,0),r:14,y:k8(k(W,0),k(X,0))}),S0.push({x:k(W,0),z:k(X,0),r:16})}function D1(W,X,K){if(!G)return;if(U){if(I1(W,X),F8(),k$)q8();if(F0)H8()}W$.push({x:k(W,0),z:k(X,0),count:0}),kQ(k(W,0),k(X,0)-10,N0(K,"Galeria"),"")}function P1(W,X){if(!W$.length){z0('crie a galeria antes com "Criar a galeria de projetos"');return}var K=W$[W$.length-1],H=K.count;K.count++;var B=-Math.PI/2+(H-3.5)*0.32,O=K.x+Math.cos(B)*11,D=K.z+Math.sin(B)*11;E4(O,D,W,3.4);var j="__galeria_"+W$.length+"_"+H;R4(j,O,D+2),q$[j]=[function(){wq(W,X)}]}function wq(W,X){if(!K6())return;if(!o0)o0=document.createElement("div"),o0.setAttribute("style","position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(6,10,16,.82);z-index:9;cursor:pointer"),o0.addEventListener("click",function(){o0.style.display="none"}),M.appendChild(o0);var K=U4[N0(W,"")];if(o0.innerHTML="",K){var H=document.createElement("img");H.src=K,H.setAttribute("style","max-width:80%;max-height:70%;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.6)"),o0.appendChild(H)}var B=document.createElement("div");B.setAttribute("style","color:#fff;font:600 20px var(--sz-game-ui-font);text-align:center"),B.textContent=N0(X,""),o0.appendChild(B);var O=document.createElement("div");O.setAttribute("style","color:#9fb;opacity:.7;font:400 13px var(--sz-game-ui-font)"),O.textContent="clique para fechar",o0.appendChild(O),o0.style.display="flex"}function G1(){return"w3d-recorde-"+(J.style||"x")}function _q(){try{var W=window.localStorage?window.localStorage.getItem(G1()):null,X=W==null?0:Number(W);return isFinite(X)&&X>0?X:0}catch(K){return 0}}function yq(W){try{if(window.localStorage)window.localStorage.setItem(G1(),String(W))}catch(X){}}function E1(W,X,K){if(!G)return null;var H=new t$,B=Q$({color:"#f59e0b"}),O=h0(W,X),D=new T0(new Q9(0.35,0.35,5,8),B);D.position.set(-4,2.5,0),D.castShadow=!0;var j=D.clone();j.position.set(4,2.5,0);var v=new T0(new X9(9,0.8,0.8),B);return v.position.set(0,5,0),H.add(D),H.add(j),H.add(v),H.position.set(W,O,X),H.rotation.y=K*Math.PI/180,Y6().add(H),H}function R1(W,X,K){if(!G)return null;var H=h0(W,X),B=Q$({color:"#22d3ee"});if(B.emissive)try{B.emissive.set("#0e7490")}catch(j){}var O=oZ?new oZ(3,0.35,8,20):new Q9(3,3,0.4,16),D=new T0(O,B);return D.position.set(W,H+3,X),D.rotation.y=K*Math.PI/180,Y6().add(D),{x:W,z:X,mesh:D,mat:B}}function j4(W){var X=u[W]||[];for(var K=0;K<X.length;K++)try{X[K]()}catch(H){C$("hook-race-"+W+"-"+K,'erro no gancho da corrida "'+W+'": '+H)}}function fq(W,X,K,H){if(G0={x:k(W,0),z:k(X,0),yaw:k(K,0),laps:Math.max(1,Math.floor(k(H,1))),checkpoints:[],state:"idle",time:0,lap:1,next:0,best:_q(),armed:!1},U)G0.portal=E1(G0.x,G0.z,G0.yaw)}function bq(){if(!G0||!G)return;if(!G0.portal)G0.portal=E1(G0.x,G0.z,G0.yaw);for(var W=0;W<G0.checkpoints.length;W++){var X=G0.checkpoints[W];if(!X.mesh){var K=R1(X.x,X.z,0);if(K)X.mesh=K.mesh,X.mat=K.mat}}C4()}function hq(W,X,K){if(!G0){z0('crie a corrida antes com "Criar a corrida"');return}var H=U?R1(k(W,0),k(X,0),k(K,0)):{x:k(W,0),z:k(X,0),mesh:null,mat:null};G0.checkpoints.push(H)}function xq(W){if(!G0||!n)return;var{x:X,z:K}=n,H=X-G0.x,B=K-G0.z,O=H*H+B*B<36;if(G0.state==="idle"){if(!O)G0.armed=!0;if(G0.armed&&O&&G0.checkpoints.length>0)G0.state="correndo",G0.time=0,G0.lap=1,G0.next=0,C4(),j4("start")}else if(G0.state==="correndo"){G0.time+=W;var D=G0.checkpoints[G0.next];if(D){var j=X-D.x,v=K-D.z;if(j*j+v*v<16){if(G0.next++,j4("checkpoint"),G0.next>=G0.checkpoints.length)if(G0.next=0,G0.lap>=G0.laps){if(G0.state="fim",!G0.best||G0.time<G0.best)G0.best=G0.time,yq(G0.time);if(j4("finish"),W4)qH(Math.round(G0.time*1000))}else G0.lap++;C4()}}var S=G0.checkpoints[G0.next];for(var h=0;h<G0.checkpoints.length;h++){var p=G0.checkpoints[h];if(p.mesh)p.mesh.scale.setScalar(p===S?1+Math.sin(r*4)*0.08:1)}F1("topo-esquerda","Tempo "+G0.time.toFixed(1)+"s  ·  ponto "+Math.min(G0.next+1,G0.checkpoints.length)+"/"+G0.checkpoints.length+"  ·  volta "+G0.lap+"/"+G0.laps)}}function C4(){if(!G0)return;for(var W=0;W<G0.checkpoints.length;W++){var X=G0.checkpoints[W];if(X.mat)try{X.mat.color.set(W===G0.next?"#22d3ee":"#0891b2")}catch(K){}}}function j1(W,X,K,H){if(!G)return null;var B=h0(W,X),O,D,j;if(K==="caixa"){var v=0.8*H;O=new T0(new X9(v,v,v),Q$({color:"#b7791f"})),D=v*0.6,j=v,O.position.set(W,B+v/2,X)}else if(K==="lata")D=0.28*H,j=0.7*H,O=new T0(new Q9(D,D,j,10),Q$({color:"#a0aec0"})),O.position.set(W,B+j/2,X);else D=0.22*H,j=0.9*H,O=new T0(new Q9(D*0.6,D,j,10),Q$({color:"#fefefe"})),O.position.set(W,B+j/2,X);O.castShadow=!0,Y6().add(O);var S={mesh:O,x:W,z:X,y:B,baseY:B,r:D,h:j,vx:0,vz:0,vy:0,tilt:0,tiltAxis:0,down:!1,home:{x:W,z:X,kind:K,s:H}};return T.push(S),S}function C1(W,X,K,H){if(W.down)return;var B=W.x-X,O=W.z-K,D=Math.sqrt(B*B+O*O)||0.001,j=Math.min(14,H);W.vx+=B/D*j,W.vz+=O/D*j,W.vy+=Math.min(4,j*0.3),W.tiltAxis=Math.atan2(O,B)}function gq(W){if(!T.length)return;var X=n?n.x:0,K=n?n.z:0,H=n?Math.abs(n.speed):0;for(var B=0;B<T.length;B++){var O=T[B];if(!O.down&&n){var D=O.x-X,j=O.z-K,v=O.r+1.2;if(D*D+j*j<v*v&&H>2)C1(O,X,K,H)}var S=Math.abs(O.vx)+Math.abs(O.vz)+Math.abs(O.vy)>0.05||O.y>O.baseY+0.01;if(!S&&!O.down)continue;O.vy-=22*W,O.x+=O.vx*W,O.z+=O.vz*W,O.y+=O.vy*W;var h=h0(O.x,O.z);if(O.y<h)O.y=h,O.vy=O.down?0:-O.vy*0.3,O.vx*=0.6,O.vz*=0.6;O.vx*=1-Math.min(1,2*W),O.vz*=1-Math.min(1,2*W);var p=Math.sqrt(O.vx*O.vx+O.vz*O.vz);if(!O.down&&(p>2.5||O.tilt>0.02)){if(O.tilt+=(Math.PI/2-O.tilt)*Math.min(1,4*W),O.tilt>1.3)O.down=!0,uq()}if(p>1.5)for(var c=0;c<T.length;c++){if(c===B)continue;var $0=T[c];if($0.down)continue;var H0=$0.x-O.x,E0=$0.z-O.z;if(H0*H0+E0*E0<(O.r+$0.r+0.15)*(O.r+$0.r+0.15))C1($0,O.x,O.z,p*0.8)}if(O.mesh)O.mesh.position.set(O.x,O.y+O.h/2,O.z),O.mesh.rotation.set(Math.sin(O.tiltAxis)*O.tilt,0,-Math.cos(O.tiltAxis)*O.tilt)}}function uq(){if(!i)return;var W=!0;for(var X=0;X<i.pins.length;X++)if(!i.pins[X].down){W=!1;break}if(W&&i.pins.length>0)for(var K=0;K<i.strikeHooks.length;K++)try{i.strikeHooks[K]()}catch(H){C$("hook-strike-"+K,'erro no "Quando derrubar todos os pinos": '+H)}}function pq(){var W=0;for(var X=0;X<T.length;X++)if(T[X].down)W++;return W}function lq(){for(var W=0;W<T.length;W++){var X=T[W];if(X.x=X.home.x,X.z=X.home.z,X.y=X.baseY,X.vx=X.vz=X.vy=0,X.tilt=0,X.down=!1,X.mesh)X.mesh.position.set(X.x,X.baseY+X.h/2,X.z),X.mesh.rotation.set(0,0,0)}}function M1(W,X,K){if(!G)return;i={x:k(W,0),z:k(X,0),pins:[],strikeHooks:[]};var H=k(K,0)*Math.PI/180,B=Math.sin(H),O=Math.cos(H),D=Math.cos(H),j=-Math.sin(H),v=0.8,S=0;for(var h=0;h<4;h++)for(var p=0;p<=h;p++){var c=(p-h/2)*v,$0=i.x+B*h*v+D*c,H0=i.z+O*h*v+j*c,E0=j1($0,H0,"pino",1);if(E0)i.pins.push(E0);S++}}function dq(){for(var W=0;W<s0.length;W++){var X=s0[W];if(X.kind==="point")R4(X.name,X.x,X.z);else if(X.kind==="zone")O1(X.name,X.x,X.z,X.r);else if(X.kind==="totemText")kQ(X.x,X.z,X.title,X.body);else if(X.kind==="totemImage")E4(X.x,X.z,X.image,X.w);else if(X.kind==="galleryCreate")D1(X.x,X.z,X.title);else if(X.kind==="galleryAdd")P1(X.image,X.caption);else if(X.kind==="bowling")M1(X.x,X.z,X.yaw);else if(X.kind==="stack")A1(X.n,X.thing,X.x,X.z);else if(X.kind==="pushPlace")g4(X.thing,X.x,X.z);else if(X.kind==="pushScatter")v1(X.n,X.x,X.z,X.r);else if(X.kind==="letters")gY(X.word,X.x,X.z,X.s);else if(X.kind==="explosive")pY(X.x,X.z);else if(X.kind==="waterfall")XY(X.x,X.z,X.h,X.deg);else if(X.kind==="lamp")k4(X.x,X.z);else if(X.kind==="fireflies")bY(X.amount);else if(X.kind==="campfire")hY(X.x,X.z);else if(X.kind==="bridge")r1(X.x1,X.z1,X.x2,X.z2,X.w);else if(X.kind==="lighthouse")t1(X.x,X.z);else if(X.kind==="npc")s1(X.name,X.x,X.z,X.color,X.hat);else if(X.kind==="coinsScatter")l1(X.n);else if(X.kind==="coinsRing")d1(X.n,X.x,X.z,X.r);else if(X.kind==="coinsLine")m1(X.n,X.x1,X.z1,X.x2,X.z2);else if(X.kind==="marker")n1(X.icon,X.x,X.z);else if(X.kind==="questHud")A4();else if(X.kind==="whisperCorner")p1(X.x,X.z);else if(X.kind==="flameNote")bQ(X.x,X.z,X.text,!1);else if(X.kind==="city")vY();else if(X.kind==="district")SY(X);else if(X.kind==="roadGrid")TY(X);else if(X.kind==="houseRow")kY(X);else if(X.kind==="stringLights")z4(X.x1,X.z1,X.x2,X.z2);else if(X.kind==="door")BY(X);else if(X.kind==="crops")NY(X);else if(X.kind==="barn")OY(X);else if(X.kind==="windmill")LY(X);else if(X.kind==="fence")IY(X);else if(X.kind==="animals")DY(X);else if(X.kind==="flag")PY(X);else if(X.kind==="rocket")GY(X)}for(var K=0;K<s0.length;K++){var H=s0[K];if(H.kind==="npcWander"){var B=jJ(H.name);if(B)B.home.r=f0(k(H.r,10),0,60)}else if(H.kind==="traffic")jY()}}function v1(W,X,K,H){var B=["tijolo","banco","cerca","lanterna","cone"],O=f0(k(W,8),1,60),D=H7(Math.round(k(X,0)*13+k(K,0)*7)+99);for(var j=0;j<O;j++){var v=D()*Math.PI*2,S=Math.sqrt(D())*f0(k(H,10),2,80);g4(B[Math.floor(D()*B.length)],k(X,0)+Math.cos(v)*S,k(K,0)+Math.sin(v)*S)}}function A1(W,X,K,H){if(!G)return;var B=X==="latas"?"lata":"caixa",O=Math.floor(f0(k(W,3),1,30)),D=B==="lata"?0.72:0.82,j=h0(k(K,0),k(H,0));for(var v=0;v<O;v++){var S=j1(k(K,0),k(H,0),B,1);if(S){if(S.baseY=j+v*D,S.y=S.baseY,S.mesh)S.mesh.position.y=S.baseY+S.h/2}}}var mq={cima:"arrowup",baixo:"arrowdown",esquerda:"arrowleft",direita:"arrowright",espaco:" ","espaço":" ",space:" ","seta cima":"arrowup","seta baixo":"arrowdown","seta esquerda":"arrowleft","seta direita":"arrowright"};function T1(W){var X=N0(W,"").toLowerCase();return mq[X]||X}function m$(W){return!!N[W]}function R9(W){return!!L[W]}function cq(){window.addEventListener("keydown",function(W){var X=String(W.key).toLowerCase(),K=!N[X]&&!W.repeat;if(N[X]=!0,K)L[X]=!0;if(zQ(),SQ(),!W.repeat){if(g0.push(String(W.code)),g0.length>10)g0.shift();if(!c0&&g0.join(",")===H$){if(c0=!0,W0)MJ();j9(660,0.09),j9(880,0.12)}}if(X===" "||X.indexOf("arrow")===0)try{W.preventDefault()}catch(H){}}),window.addEventListener("pointerdown",function(){SQ()}),window.addEventListener("keyup",function(W){N[String(W.key).toLowerCase()]=!1}),window.addEventListener("contextmenu",function(){N={}}),window.addEventListener("blur",function(){N={}}),oq()}function oq(){try{var W=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;if(!W||!M)return}catch(S){return}var X=document.createElement("div");X.setAttribute("role","application"),X.setAttribute("aria-label","Controle de direção"),X.setAttribute("style","position:absolute;left:20px;bottom:20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);z-index:8;touch-action:none");var K=document.createElement("div");K.setAttribute("style","position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.55)"),X.appendChild(K),M.appendChild(X);var H=!1;function B(S,h){N.w=h<-0.3,N.s=h>0.3,N.a=S<-0.3,N.d=S>0.3,K.style.left=35+S*35+"px",K.style.top=35+h*35+"px"}function O(){N.w=N.s=N.a=N.d=!1,K.style.left="35px",K.style.top="35px"}X.addEventListener("pointerdown",function(S){H=!0,zQ(),SQ();try{X.setPointerCapture(S.pointerId)}catch(h){}}),X.addEventListener("pointermove",function(S){if(!H)return;var h=X.getBoundingClientRect(),p=(S.clientX-h.left-60)/45,c=(S.clientY-h.top-60)/45,$0=Math.sqrt(p*p+c*c);if($0>1)p/=$0,c/=$0;B(p,c)}),X.addEventListener("pointerup",function(){H=!1,O()}),X.addEventListener("pointercancel",function(){H=!1,O()}),X.addEventListener("lostpointercapture",function(){H=!1,O()});function D(S,h,p,c,$0){var H0=document.createElement("button");H0.type="button",H0.textContent=h,H0.setAttribute("aria-label",c),H0.title=c,H0.setAttribute("style","width:54px;height:54px;border-radius:50%;border:0;background:"+$0+";color:#fff;font-weight:800;font-size:18px;z-index:8;touch-action:none;user-select:none");var E0=function(){N[p]=!1};H0.addEventListener("pointerdown",function(M0){try{M0.preventDefault(),H0.setPointerCapture(M0.pointerId)}catch(m0){}if(zQ(),SQ(),!N[p])L[p]=!0;N[p]=!0}),H0.addEventListener("pointerup",E0),H0.addEventListener("pointercancel",E0),H0.addEventListener("lostpointercapture",E0),S.appendChild(H0)}var j=document.createElement("div");j.setAttribute("style","position:absolute;right:16px;bottom:16px;display:grid;grid-template-columns:repeat(2,54px);gap:10px;z-index:8"),M.appendChild(j),D(j,"⤒"," ","Pular","rgba(16,185,129,.78)"),D(j,"⇧","shift","Turbo ou correr","rgba(249,115,22,.78)"),D(j,"E","e","Interagir","rgba(34,211,238,.78)"),D(j,"H","h","Buzinar","rgba(168,85,247,.78)");var v=document.createElement("div");v.setAttribute("style","position:absolute;right:16px;top:16px;display:flex;gap:8px;z-index:8"),M.appendChild(v),D(v,"M","m","Abrir mapa","rgba(15,23,42,.72)"),D(v,"P","p","Abrir pódio","rgba(15,23,42,.72)")}function nq(){return"#szw3d-stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0f14;z-index:0;font-family:var(--sz-game-ui-font)}#szw3d-frame{position:relative}#szw3d-canvas{display:block;background:#0b0f14}.szw3d-splash{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,12,18,0.5);color:#fff;text-align:center;z-index:5;transition:opacity .3s}.szw3d-splash h1{margin:0;font-size:34px;text-shadow:0 2px 12px rgba(0,0,0,.5)}.szw3d-splash p{margin:0;font-size:15px;opacity:.85}.szw3d-splash button{font:inherit;font-size:17px;font-weight:700;padding:10px 26px;border-radius:999px;border:0;cursor:pointer;background:#10b981;color:#04281d}.szw3d-splash button:hover{background:#34d399}.szw3d-hidden{opacity:0;pointer-events:none}"}function K6(){if(q)return!0;try{if(typeof document>"u"||!document||!document.body)return!1;R=document.createElement("style"),R.id="szw3d-style",R.textContent=nq(),document.head.appendChild(R),C=document.createElement("div"),C.id="szw3d-stage",M=document.createElement("div"),M.id="szw3d-frame",A=document.createElement("canvas"),A.id="szw3d-canvas",A.width=J.w,A.height=J.h,M.appendChild(A),C.appendChild(M),document.body.appendChild(C),E=document.createElement("div"),E.className="szw3d-splash";var W=document.createElement("h1");W.textContent="Meu Mundo 3D";var X=document.createElement("p");X.textContent="WASD ou setas dirigem · espaço pula";var K=document.createElement("button");return K.textContent="Começar o passeio",K.addEventListener("click",function(){zQ()}),E.appendChild(W),E.appendChild(X),E.appendChild(K),M.appendChild(E),q=!0,!0}catch(H){return z0("não consegui montar a tela do mundo: "+H),!1}}function zQ(){if(E)E.classList.add("szw3d-hidden")}function S1(){if(!q||!A)return;var W=J.w/J.h,X=15,K=window.innerWidth-X*2,H=window.innerHeight-X*2;if(!(K>0)||!(H>0))return;var B,O;if(K/H>W)O=H,B=O*W;else B=K,O=B/W;A.style.width=B+"px",A.style.height=O+"px"}function sq(){if(U)return!0;try{var W=U8();if(y=new MW({antialias:!0,canvas:A}),y.setPixelRatio(K9.tier==="turbo"?0.75:1),y.setSize(J.w,J.h,!1),y.shadowMap){if(y.shadowMap.enabled=!0,dZ)y.shadowMap.type=dZ}if(p6)y.toneMapping=p6;if(G=new cZ,iq(),v5){var X=v5;v5=null,eW(X)}if(_Z)G.fog=new _Z(W.fog,J.world*0.45,J.world*1.5);f=new eJ(60,J.w/J.h,0.1,Math.max(600,J.world*4)),L0=new M9(0,0,0),b=new JW(16777215,0.6),G.add(b);var K=new iJ(16777215,1.05);if(d=K,K.position.set(J.world*0.25,J.world*0.4,J.world*0.18),K.castShadow=!0,K.shadow&&K.shadow.camera){var H=45;if(K.shadow.camera.near=0.5,K.shadow.camera.far=J.world*1.6,K.shadow.camera.left=-H,K.shadow.camera.right=H,K.shadow.camera.top=H,K.shadow.camera.bottom=-H,K.shadow.mapSize&&K.shadow.mapSize.set){var B=K9.tier==="turbo"?1024:2048;K.shadow.mapSize.set(B,B)}K.shadow.normalBias=0.05}if(G.add(K),K.target)g=K.target,G.add(g);if(E9=new M9,F8(),J0)G4();if(V0)MJ();if(R$)S4();if(VJ)a1();if(VJ&&!V0&&!R$)a8="boat",B9=!0;if(Qq(),dq(),bq(),PQ)P4();if(U=!0,J.style==="lua"&&!A5)d7=0,A5=!0;if(l9&&l9.mode==="neon"){if(!A5)d7=0,A5=!0;if(A8==="limpo")A8="chuva"}if(A5)OJ=-1,vQ();if(A8!=="limpo")AQ();if(A9!=="nenhuma")_1();if(Z9)z1();return!0}catch(O){return z0("não consegui montar o mundo 3D: "+O),!1}}function iq(){if(!G)return;var W=U8();try{var X=document.createElement("canvas");X.width=2,X.height=256;var K=X.getContext("2d");if(!K){G.background=new y$(W.skyTop);return}var H=K.createLinearGradient(0,0,0,256);if(H.addColorStop(0,W.skyTop),H.addColorStop(1,W.skyBot),K.fillStyle=H,K.fillRect(0,0,2,256),x&&x.dispose)try{x.dispose()}catch(B){}x=new l8(X),G.background=x}catch(B){try{G.background=new y$(W.skyTop)}catch(O){}}}function aq(){if(z)return z;try{var W=new Uint8Array([96,176,255]),X=i6||void 0;if(z=new o5(W,3,1,X),I5)z.minFilter=I5,z.magFilter=I5;z.needsUpdate=!0}catch(K){z=null}return z}function Q$(W){var X=aq();if(uZ&&X){var K={};for(var H in W)K[H]=W[H];return K.gradientMap=X,new uZ(K)}if(gZ)return new gZ(W);return new s6(W)}function F8(){if(!G)return;if(o){try{if(G.remove(o),o.geometry&&o.geometry.dispose)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose()}catch(V$){}o=null}var W=U8(),X=Math.max(0.75,Math.min(2,Q.smooth*0.25)),K=0.75+Math.sqrt(Math.max(0,Q.hills)/10),H=K9.tier==="turbo"?160:320,B=Math.max(64,Math.min(H,Math.ceil(J.world/X*K))),O=new L7(J.world,J.world,B,B);O.rotateX(-Math.PI/2);var D=O.attributes.position,j=new Float32Array(D.count),v;for(v=0;v<D.count;v++){var S=oW(D.getX(v),D.getZ(v));j[v]=S,D.setY(v,S)}_={seg:B,world:J.world,values:j},O.computeVertexNormals();var h=new y$(W.low),p=new y$(W.high),c=new y$(W.rock),$0=new y$,H0=O.attributes.normal,E0=new Float32Array(D.count*3),M0=Math.max(1,Q.hills*1.15);for(v=0;v<D.count;v++){var m0=f0((D.getY(v)/M0+1)/2,0,1);$0.copy(h).lerp(p,m0);var Z$=H0.getY(v),y0=S8(0.86,0.62,Z$);if(y0>0)$0.lerp(c,y0);E0[v*3]=$0.r,E0[v*3+1]=$0.g,E0[v*3+2]=$0.b}O.setAttribute("color",new z9(E0,3));var u0=Q$({vertexColors:!0});o=new T0(O,u0),o.receiveShadow=!0,G.add(o)}function GJ(){return Y[V0&&V0.style||"passeio"]||Y.passeio}function wQ(){if(d$||!G)return;$$=new p9;var W=new Float32Array(G9*3),X=new Float32Array(G9*3);for(var K=0;K<G9;K++)W[K*3+1]=-9999;$$.setAttribute("position",new z9(W,3)),$$.setAttribute("color",new z9(X,3));var H=new w7({size:0.5,vertexColors:!0,sizeAttenuation:!0,transparent:!0,opacity:0.95,depthWrite:!1}),B=_5();if(B)H.map=B;d$=new z7($$,H),d$.frustumCulled=!1,G.add(d$),p$=[];for(var O=0;O<G9;O++)p$.push({x:0,y:-9999,z:0,vx:0,vy:0,vz:0,age:0,ttl:0,g:6,flut:0})}function EJ(W,X,K,H,B,O,D,j,v,S){if(!p$)return;var h=u$;u$=(u$+1)%G9;var p=p$[h];p.x=W,p.y=X,p.z=K,p.vx=H,p.vy=B,p.vz=O,p.age=0,p.ttl=D,p.g=j,p.flut=v;var c=$$.getAttribute("color"),$0=new y$(S);c.setXYZ(h,$0.r,$0.g,$0.b),c.needsUpdate=!0}function e9(){if(R$&&!B9&&B$)return{x:B$.x,y:B$.y,z:B$.z};if(B9&&a8==="boat"&&P9)return{x:P9.x,y:P9.y,z:P9.z};if(n)return{x:n.x,y:n.y,z:n.z};if(P9)return{x:P9.x,y:P9.y,z:P9.z};return{x:0,y:h0(0,0),z:0}}function RJ(){if(R$&&!B9&&B$)return B$;if(B9&&a8==="boat"&&P9)return P9;return n}function M4(){if(wQ(),!p$)return;var W=e9();for(var X=0;X<90;X++){var K=Math.random()*Math.PI*2,H=1+Math.random()*3;EJ(W.x+(Math.random()-0.5)*2,W.y+5+Math.random()*2,W.z+(Math.random()-0.5)*2,Math.cos(K)*H,1+Math.random()*2.5,Math.sin(K)*H,2.4,4.5,1,y7[X%y7.length])}}function rq(){if(wQ(),!p$)return;var W=e9(),X=W.x+(Math.random()-0.5)*26,K=W.z-14-Math.random()*14;v9.push({x:X,z:K,y:h0(X,K)+1,peak:20+Math.random()*10,cd:0}),j9(988,0.12)}function tq(W,X,K){var H=y7[Math.floor(Math.random()*y7.length)];for(var B=0;B<80;B++){var O=Math.random()*Math.PI*2,D=Math.acos(2*Math.random()-1),j=6+Math.random()*4;EJ(W,X,K,Math.sin(D)*Math.cos(O)*j,Math.cos(D)*j,Math.sin(D)*Math.sin(O)*j,1.6,5,0,H)}j9(65,0.35),v0=Math.max(v0,0.15),F$=Math.max(F$,0.08)}function eq(W){for(var X=v9.length-1;X>=0;X--){var K=v9[X];if(K.y+=26*W,K.cd-=W,K.cd<=0&&p$)K.cd=0.03,EJ(K.x,K.y,K.z,0,-1,0,0.5,2,0,"#fde68a");if(K.y>=K.peak)tq(K.x,K.y,K.z),v9.splice(X,1)}if(!p$)return;var H=$$.getAttribute("position"),B=!1;for(var O=0;O<G9;O++){var D=p$[O];if(D.ttl<=0)continue;if(D.age+=W,D.age>=D.ttl){D.ttl=0,H.setXYZ(O,0,-9999,0),B=!0;continue}D.vy-=D.g*W,D.x+=D.vx*W+(D.flut?Math.sin((D.age+O)*7)*0.8*W:0),D.y+=D.vy*W,D.z+=D.vz*W,H.setXYZ(O,D.x,D.y,D.z),B=!0}if(B)H.needsUpdate=!0}function $H(W){if(!G){z0('use "Soltar um tornado" depois do "Começar o passeio"');return}var X=f0(k(W,15),3,60);if(U7){U7.ttl=X;return}var K=new t$,H=[],B=[],O=[{r1:0.9,r2:1.8,h:5,y:2.5},{r1:1.8,r2:3,h:6,y:8},{r1:3,r2:4.4,h:7,y:14.5}];for(var D=0;D<O.length;D++){var j=O[D],v=new Y9({color:"#64748b",transparent:!0,opacity:0.34,depthWrite:!1}),S=new T0(new Q9(j.r1,j.r2,j.h,10,1,!0),v);S.position.y=j.y,K.add(S),H.push(S),B.push(v)}var h=e9(),p=h.x+24,c=h.z+10;K.position.set(p,h0(p,c),c),G.add(K),U7={group:K,cyls:H,mats:B,ttl:X,x:p,z:c,tx:p,tz:c,flingCd:0}}function JH(W){if(!U7)return;var X=U7;X.ttl-=W;for(var K=0;K<X.cyls.length;K++)X.cyls[K].rotation.y+=(3.4-K*0.8)*W;var H=X.tx-X.x,B=X.tz-X.z,O=Math.sqrt(H*H+B*B);if(O<3){var D=J.world/2-12;X.tx=(Math.random()*2-1)*D,X.tz=(Math.random()*2-1)*D}else X.x+=H/O*7*W,X.z+=B/O*7*W;if(X.group.position.set(X.x,h0(X.x,X.z),X.z),X.flingCd-=W,n){var j=X.x-n.x,v=X.z-n.z,S=Math.sqrt(j*j+v*v);if(S<9&&S>0.01)n.x+=j/S*8*W,n.z+=v/S*8*W;if(S<3&&X.flingCd<=0)X.flingCd=1.5,n.vy=15,n.airborne=!0,n.pitchV+=2.5,v0=Math.max(v0,0.5),F$=Math.max(F$,0.35)}if(X.ttl<1)for(var h=0;h<X.mats.length;h++)X.mats[h].opacity=0.34*Math.max(0,X.ttl);if(X.ttl<=0){try{G.remove(X.group);for(var p=0;p<X.cyls.length;p++)X.cyls[p].geometry.dispose(),X.mats[p].dispose()}catch(c){}U7=null}}var _Q=["#3e8f3e","#57a344","#2d6a34","#357c3c","#3f8f46"],k1={primavera:{leaves:["#55b055","#74c463","#3f8d4b","#4da457","#58b862"],grass:["#3f7c2f","#68b04a"],weather:null},verao:{leaves:null,grass:null,weather:null},outono:{leaves:["#d97706","#ea9a3c","#b45309","#c2620e","#a16207"],grass:["#8a5a1f","#c98a2e"],weather:"folhas"},inverno:{leaves:["#e5e7eb","#f3f4f6","#cbd5e1","#dbe3ec","#eef1f5"],grass:["#9fb2c4","#dbe4ee"],weather:"neve"}};function z1(){if(!Z9||!U)return;var W=k1[Z9];if(!W)return;if(!O9){O9={leaves:{},grass:null};for(var X=0;X<_Q.length;X++){var K=_Q[X];if(E7&&E7[K])O9.leaves[K]="#"+E7[K].color.getHexString()}if(k$&&k$.uniforms.uColorA)O9.grass=[k$.uniforms.uColorA.value.clone(),k$.uniforms.uColorB.value.clone()]}for(var H=0;H<_Q.length;H++){var B=_Q[H];if(!E7||!E7[B])continue;var O=W.leaves?W.leaves[H]:O9.leaves[B]||B;try{E7[B].color.set(O)}catch(v){}}if(k$&&k$.uniforms.uColorA){if(W.grass){var D=new y$(W.grass[0]),j=new y$(W.grass[1]);k$.uniforms.uColorA.value.set(D.r,D.g,D.b),k$.uniforms.uColorB.value.set(j.r,j.g,j.b)}else if(O9.grass)k$.uniforms.uColorA.value.copy(O9.grass[0]),k$.uniforms.uColorB.value.copy(O9.grass[1])}if(W.weather&&A8==="limpo")A8=W.weather,AQ()}var w1={nenhuma:0,poucas:10,muitas:26};function _1(){if(V9){try{G.remove(V9.mesh),V9.geo.dispose(),V9.mat.dispose()}catch(S){}V9=null}var W=w1[A9]||0;if(!G||W<=0)return;var X=H7(777),K=new Float32Array(W*3),H=J.world*0.9;for(var B=0;B<W;B++)K[B*3]=(X()*2-1)*H,K[B*3+1]=55+X()*30,K[B*3+2]=(X()*2-1)*H;var O=new p9;O.setAttribute("position",new z9(K,3));var D=new w7({color:"#ffffff",size:34,sizeAttenuation:!0,transparent:!0,opacity:0.5,depthWrite:!1}),j=_5();if(j)D.map=j;var v=new z7(O,D);v.frustumCulled=!1,G.add(v),V9={mesh:v,geo:O,mat:D,pos:K,n:W}}function QH(W){if(!V9)return;var X=n?n.x:0,K=n?n.z:0,H=J.world*0.95;for(var B=0;B<V9.n;B++){var O=B*3;if(V9.pos[O]+=(1.2+z5*2.4)*W,V9.pos[O]>X+H)V9.pos[O]-=H*2}V9.geo.attributes.position.needsUpdate=!0}function ZH(){if(r9||!G)return;var W=new p9;W.setAttribute("position",new z9(new Float32Array(54),3));var X=new o6({color:"#fef08a",transparent:!0,opacity:0.95});r9=new n6(W,X),r9.frustumCulled=!1,r9.visible=!1,G.add(r9)}function XH(){if(ZH(),!r9)return;var W=e9(),X=W.x+(Math.random()*2-1)*46,K=W.z+(Math.random()*2-1)*46,H=r9.geometry.getAttribute("position"),B=X,O=44,D=K;for(var j=0;j<9;j++){var v=B+(Math.random()-0.5)*4,S=O-(44-h0(X,K))/9,h=D+(Math.random()-0.5)*4;H.setXYZ(j*2,B,O,D),H.setXYZ(j*2+1,v,S,h),B=v,O=S,D=h}if(H.needsUpdate=!0,r9.visible=!0,I7=0.22,M){if(!E8)E8=document.createElement("div"),E8.setAttribute("style","position:absolute;inset:0;background:#ffffff;opacity:0;pointer-events:none;z-index:6;"),M.appendChild(E8);E8.style.opacity="0.7"}var p=X-W.x,c=K-W.z,$0=Math.sqrt(p*p+c*c);if(e5.push({t:0.15+$0/90}),$0<7&&n)n.pitchV+=2.2,v0=Math.max(v0,0.6),F$=Math.max(F$,0.4),e$=0.35}function WH(W){if(I7>0){if(I7-=W,I7<=0&&r9)r9.visible=!1}if(E8){var X=parseFloat(E8.style.opacity||"0");if(X>0)E8.style.opacity=String(Math.max(0,X-W*3))}for(var K=e5.length-1;K>=0;K--)if(e5[K].t-=W,e5[K].t<=0)j9(52,0.5),j9(38,0.7),e5.splice(K,1);if(A8!=="tempestade"||!U)return;if(_9-=W,_9<=0)_9=4+Math.random()*5,XH()}function U6(W){try{return window.localStorage.getItem(W)}catch(X){return null}}function yQ(W,X){try{window.localStorage.setItem(W,X)}catch(K){}}function YH(W){var X=N0(W,"");if(!X)return;var K="szw3d:ach:"+X;if(U6(K))return;if(yQ(K,"1"),M){if(!V8)V8=document.createElement("div"),V8.setAttribute("style","position:absolute;top:52px;right:12px;padding:8px 14px;border-radius:12px;background:#fbbf24;color:#3b2900;font:800 15px var(--sz-game-ui-font);z-index:9;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.35);display:none;"),M.appendChild(V8);V8.textContent="\uD83C\uDFC6 Conquista: "+X,V8.style.display="block",y1=r+3}M4(),j9(988,0.1),j9(1319,0.16);var H=BJ[X]||[];for(var B=0;B<H.length;B++)try{H[B]()}catch(O){C$("hook-ach-"+X,'erro no "Quando ganhar a conquista": '+O)}}var y1=0;function VH(){if(V8&&V8.style.display==="block"&&r>y1)V8.style.display="none"}function KH(){if(M8||!M)return;M8=document.createElement("canvas"),M8.width=140,M8.height=140,M8.setAttribute("style","position:absolute;bottom:12px;right:12px;width:140px;height:140px;border-radius:10px;z-index:7;pointer-events:none;opacity:.92;"),M.appendChild(M8)}function f1(W,X){var K=U8();W.fillStyle=K.ground2||"#3f6212",W.fillRect(0,0,X,X);var H=J.world/2,B=function(Z$){return(Z$+H)/J.world*X},O=function(Z$,y0,u0,V$){W.fillStyle=u0,W.beginPath(),W.arc(B(Z$),B(y0),V$,0,Math.PI*2),W.fill()},D;if(J0){W.fillStyle="#2b6cb0";var j=24,v=X/j;for(var S=0;S<j;S++)for(var h=0;h<j;h++){var p=h/(j-1)*J.world-H,c=S/(j-1)*J.world-H;if(h0(p,c)<J0.y-0.2)W.fillRect(h*v,S*v,v+1,v+1)}}if(s$){W.strokeStyle="#6b7280",W.lineWidth=Math.max(2,X*0.022),W.beginPath(),W.arc(B(s$.cx),B(s$.cz),s$.ringR/J.world*X,0,Math.PI*2),W.stroke();for(D=0;D<s$.entries.length;D++){var $0=s$.entries[D];W.beginPath(),W.moveTo(B(s$.cx+Math.cos($0.ang)*s$.plazaR),B(s$.cz+Math.sin($0.ang)*s$.plazaR)),W.lineTo(B(s$.cx+Math.cos($0.ang)*s$.ringR),B(s$.cz+Math.sin($0.ang)*s$.ringR)),W.stroke()}O(s$.cx,s$.cz,"#d9c9a3",3)}for(D=0;D<f$.length;D++)O(f$[D].x,f$[D].z,"#22d3ee",3);for(D=0;D<D7.length;D++)O(D7[D].x,D7[D].z,"#f97316",3);for(D=0;D<M5.length;D++)O(M5[D].x,M5[D].z,"#f8fafc",4);if(G0)for(D=0;D<G0.checkpoints.length;D++)O(G0.checkpoints[D].x,G0.checkpoints[D].z,"#4ade80",3);var H0=e9(),E0=RJ()?RJ().yaw:0,M0=B(H0.x),m0=B(H0.z);W.fillStyle="#fde68a",W.save(),W.translate(M0,m0),W.rotate(Math.atan2(Math.sin(E0),Math.cos(E0))*0+-E0),W.beginPath(),W.moveTo(0,-7),W.lineTo(5,6),W.lineTo(-5,6),W.closePath(),W.fill(),W.restore()}function UH(W){if(VH(),NJ==="off")return;if(KH(),!M8)return;if(X4-=W,X4>0)return;X4=0.15;var X=M8.getContext("2d");if(X)f1(X,140);if(R9("m"))b1()}function b1(){if(v8){try{M.removeChild(v8)}catch(H){}v8=null;return}if(!M)return;v8=document.createElement("div"),v8.setAttribute("style","position:absolute;inset:0;background:rgba(2,6,23,.66);display:flex;align-items:center;justify-content:center;z-index:10;");var W=document.createElement("canvas");W.width=420,W.height=420,W.setAttribute("style","width:min(78%,420px);height:auto;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.5);cursor:"+(NJ==="teleporte"?"crosshair":"default")+";"),v8.appendChild(W);var X=document.createElement("div");X.setAttribute("style","position:absolute;bottom:18px;left:0;right:0;text-align:center;color:#e2e8f0;font:700 14px var(--sz-game-ui-font);"),X.textContent=NJ==="teleporte"?"Clique para TELEPORTAR · M fecha":"M fecha",v8.appendChild(X),M.appendChild(v8);var K=W.getContext("2d");if(K)f1(K,420);if(NJ==="teleporte")W.addEventListener("pointerdown",function(H){var B=W.getBoundingClientRect(),O=J.world/2,D=(H.clientX-B.left)/B.width*J.world-O,j=(H.clientY-B.top)/B.height*J.world-O;if(R$&&!B9&&B$)B$.x=D,B$.z=j,B$.y=d9(D,j,null);else if(n)n.x=D,n.z=j,n.y=d9(D,j,null),n.speed=0;l0=!0,b1()})}function h1(){var W=U6("szw3d:podium");if(!W)return[];try{var X=JSON.parse(W);return X&&X.length?X:[]}catch(K){return[]}}function qH(W){if(!M||W9)return;gW=W;var X=document.createElement("div");X.setAttribute("style","position:absolute;inset:0;background:rgba(2,6,23,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:11;color:#f8fafc;font:800 20px var(--sz-game-ui-font);"),X.innerHTML="";var K=document.createElement("div");K.textContent="\uD83C\uDFC1 Suas iniciais (setas mudam, E confirma)",K.style.font="800 17px var(--sz-game-ui-font)",X.appendChild(K);var H=document.createElement("div");H.setAttribute("style","display:flex;gap:12px;font:900 44px var(--sz-game-ui-font);"),X.appendChild(H),M.appendChild(X),W9={el:X,row:H,slots:[0,0,0],idx:0},x1(),N={}}var fQ="ABCDEFGHIJKLMNOPQRSTUVWXYZ";function x1(){if(!W9)return;var W="";for(var X=0;X<3;X++){var K=fQ.charAt(W9.slots[X]);W+='<span style="padding:4px 12px;border-radius:10px;background:'+(X===W9.idx?"#22d3ee":"rgba(255,255,255,.12)")+";color:"+(X===W9.idx?"#04252b":"#f8fafc")+';">'+K+"</span>"}W9.row.innerHTML=W}function HH(){if(!W9)return;if(R9("arrowleft")||R9("a"))W9.idx=(W9.idx+2)%3;if(R9("arrowright")||R9("d"))W9.idx=(W9.idx+1)%3;if(R9("arrowup")||R9("w"))W9.slots[W9.idx]=(W9.slots[W9.idx]+1)%26;if(R9("arrowdown")||R9("s"))W9.slots[W9.idx]=(W9.slots[W9.idx]+25)%26;if(x1(),R9("e")||R9("enter")){var W=fQ.charAt(W9.slots[0])+fQ.charAt(W9.slots[1])+fQ.charAt(W9.slots[2]),X=h1();X.push({ini:W,ms:gW}),X.sort(function(K,H){return K.ms-H.ms}),X=X.slice(0,5),yQ("szw3d:podium",JSON.stringify(X));try{M.removeChild(W9.el)}catch(K){}W9=null,g1()}N={},L={}}function FH(W){var X=Math.floor(W/1000),K=Math.floor(X/60),H=X%60,B=Math.floor(W%1000);return K+":"+(H<10?"0":"")+H+"."+(B<100?B<10?"00":"0":"")+B}function g1(){if(!M)return;var W=h1(),X=document.createElement("div");X.setAttribute("style","position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);min-width:230px;padding:14px 20px;border-radius:16px;background:rgba(2,6,23,.85);color:#f8fafc;font:700 16px var(--sz-game-ui-font);z-index:11;text-align:center;");var K='<div style="font-size:19px;margin-bottom:8px;">\uD83C\uDFC6 Pódio</div>';if(!W.length)K+="<div>Ninguém correu ainda!</div>";for(var H=0;H<W.length;H++)K+="<div>"+(H+1)+"º "+W[H].ini+" — "+FH(W[H].ms)+"</div>";X.innerHTML=K,M.appendChild(X),setTimeout(function(){try{M.removeChild(X)}catch(B){}},3200)}function bQ(W,X,K,H){if(!G)return;var B=document.createElement("canvas");B.width=64,B.height=64;var O=B.getContext("2d");if(O)O.font="46px "+$,O.textAlign="center",O.textBaseline="middle",O.fillText("\uD83D\uDD25",32,36);var D=new l8(B);if(!a6||!r6)return;var j=new a6(new r6({map:D,depthWrite:!1}));j.scale.set(1.4,1.4,1);var v=k(W,0),S=k(X,0);j.position.set(v,d9(v,S,null)+1,S),G.add(j);var h=N0(K,"...");if(BQ.push({sprite:j,x:v,z:S,text:h}),S$.push({x:v,z:S,r:2.4,label:"E: ler",prio:0,promptY:d9(v,S,null)+2.2,fire:function(){B1(h,4)}}),H){var p=U6("szw3d:whispers"),c=[];try{c=p?JSON.parse(p):[]}catch($0){c=[]}if(c.push({x:v,z:S,text:h}),c.length>20)c=c.slice(c.length-20);yQ("szw3d:whispers",JSON.stringify(c))}}function BH(){if(!M||Z6)return;var W=document.createElement("div");W.setAttribute("style","position:absolute;inset:0;background:rgba(2,6,23,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;z-index:11;");var X=document.createElement("div");X.textContent="\uD83D\uDD25 Deixe seu recado (Enter salva, Esc cancela)",X.setAttribute("style","color:#f8fafc;font:800 16px var(--sz-game-ui-font);"),W.appendChild(X);var K=document.createElement("input");K.setAttribute("maxlength","80"),K.setAttribute("style","width:min(70%,340px);padding:10px 14px;border-radius:12px;border:none;font:700 16px var(--sz-game-ui-font);"),W.appendChild(K),M.appendChild(W),Z6={el:W,input:K},N={},setTimeout(function(){try{K.focus()}catch(H){}},30),K.addEventListener("keydown",function(H){if(H.stopPropagation(),H.key==="Enter"){var B=String(K.value||"").trim();if(u1(),B&&g7)bQ(g7.x+(Math.random()*2-1)*4,g7.z+2+Math.random()*3,B,!0)}else if(H.key==="Escape")u1()})}function u1(){if(!Z6)return;try{M.removeChild(Z6.el)}catch(W){}Z6=null,N={}}function p1(W,X){g7={x:k(W,0),z:k(X,0)},kQ(g7.x,g7.z,"Recados","aperte E e escreva"),S$.push({x:g7.x,z:g7.z,r:3,label:"E: escrever",prio:1,promptY:d9(g7.x,g7.z,null)+2.6,fire:BH});var K=U6("szw3d:whispers");if(K)try{var H=JSON.parse(K);for(var B=0;B<H.length;B++)bQ(H[B].x,H[B].z,H[B].text,!1)}catch(O){}}function NH(){for(var W=0;W<BQ.length;W++){var X=BQ[W];X.sprite.position.y=d9(X.x,X.z,null)+1+Math.sin(r*3+W)*0.12}}function OH(){if(W8||!G)return;var W=new Q9(0.42,0.42,0.1,12);W.rotateX(Math.PI/2),W8=new r$(W,Q$({color:"#fbbf24"}),Z4),W8.count=0,W8.frustumCulled=!1,G.add(W8),Y8=[]}function v4(W,X){if(OH(),!Y8||Y8.length>=Z4){C$("coins-max","muitas moedas (teto "+Z4+")");return}var K=d9(k(W,0),k(X,0),null)+1;Y8.push({x:k(W,0),z:k(X,0),y:K,taken:!1}),W8.count=Y8.length}function l1(W){var X=f0(k(W,20),1,200),K=H7(1234+X),H=J.world/2-6;for(var B=0;B<X;B++){var O=(K()*2-1)*H,D=(K()*2-1)*H;if(J0&&h0(O,D)<J0.y-0.4)continue;v4(O,D)}}function d1(W,X,K,H){var B=f0(k(W,8),1,64);for(var O=0;O<B;O++){var D=O/B*Math.PI*2;v4(k(X,0)+Math.cos(D)*k(H,6),k(K,0)+Math.sin(D)*k(H,6))}}function m1(W,X,K,H,B){var O=f0(k(W,10),2,64);for(var D=0;D<O;D++){var j=D/(O-1);v4(k(X,0)+(k(H,0)-k(X,0))*j,k(K,0)+(k(B,0)-k(K,0))*j)}}function LH(){if($5||!M)return;$5=document.createElement("div"),$5.setAttribute("style","position:absolute;top:10px;right:12px;padding:5px 12px;border-radius:12px;background:rgba(15,23,42,.72);color:#fde68a;font:800 16px var(--sz-game-ui-font);z-index:7;pointer-events:none;"),M.appendChild($5),$5.textContent="\uD83E\uDE99 0"}function IH(W){if(!W8||!Y8||!Y8.length)return;if(!q0)q0=new o8;var X=e9(),K=r*2.4;for(var H=0;H<Y8.length;H++){var B=Y8[H];if(B.taken)q0.position.set(0,-9999,0),q0.rotation.set(0,0,0);else{var O=X.x-B.x,D=X.z-B.z,j=X.y+1-B.y;if(O*O+D*D+j*j<2.6){if(B.taken=!0,qQ++,LH(),$5)$5.textContent="\uD83E\uDE99 "+qQ;j9(1320,0.07),j9(1760,0.09);for(var v=0;v<HQ.length;v++)try{HQ[v]()}catch(S){C$("hook-coin-"+v,'erro no "Quando pegar uma moeda": '+S)}q0.position.set(0,-9999,0)}else q0.position.set(B.x,B.y+Math.sin(K+H)*0.12,B.z),q0.rotation.set(0,K+H*0.7,0)}q0.updateMatrix(),W8.setMatrixAt(H,q0.matrix)}W8.instanceMatrix.needsUpdate=!0}function DH(){if(x7||!M)return;x7=document.createElement("div"),x7.setAttribute("style","position:absolute;top:10px;left:12px;max-width:300px;padding:6px 12px;border-radius:12px;background:rgba(15,23,42,.72);color:#e2e8f0;font:700 14px var(--sz-game-ui-font);z-index:7;pointer-events:none;display:none;"),M.appendChild(x7)}function A4(){if(DH(),!x7)return;var W=null;for(var X=0;X<C8.length;X++)if(!C8[X].done){W=C8[X];break}if(W)x7.textContent="⭐ Missão: "+W.desc,x7.style.display="block";else if(C8.length)x7.textContent="\uD83C\uDFC6 Todas as missões completas!",x7.style.display="block";else x7.style.display="none"}function c1(W){for(var X=0;X<C8.length;X++)if(C8[X].name===W)return C8[X];return null}function PH(W){var X=c1(N0(W,""));if(!X){z0('não achei a missão "'+N0(W,"")+'" — crie com "Criar a missão"');return}if(X.done)return;X.done=!0,A4(),M4(),j9(880,0.12),j9(1175,0.16);var K=FJ[X.name]||[];for(var H=0;H<K.length;H++)try{K[H]()}catch(B){C$("hook-quest-"+X.name,'erro no "Quando completar a missão": '+B)}}var o1={alerta:"❗",estrela:"⭐",alvo:"\uD83C\uDFAF",moeda:"\uD83D\uDCB0"};function n1(W,X,K){if(!G)return;var H=o1[W];if(!H)return;var B=document.createElement("canvas");B.width=64,B.height=64;var O=B.getContext("2d");if(!O)return;O.font="48px "+$,O.textAlign="center",O.textBaseline="middle",O.fillText(H,32,36);var D=new l8(B),j=new r6?new r6({map:D,depthWrite:!1}):null;if(!j||!a6)return;var v=new a6(j);v.scale.set(2.2,2.2,1),G.add(v),FQ.push({sprite:v,x:k(X,0),z:k(K,0)})}function GH(){for(var W=0;W<FQ.length;W++){var X=FQ[W];X.sprite.position.set(X.x,d9(X.x,X.z,null)+3.4+Math.sin(r*2+W)*0.3,X.z)}}function EH(){if(G7||!M)return;G7=document.createElement("div"),G7.setAttribute("style","position:absolute;bottom:70px;left:50%;transform:translateX(-50%) rotate(0deg);font:900 30px var(--sz-game-ui-font);color:#fde68a;text-shadow:0 2px 6px rgba(0,0,0,.5);z-index:7;pointer-events:none;display:none;"),G7.textContent="⬆",M.appendChild(G7)}function RH(){if(!J5){if(G7)G7.style.display="none";return}if(EH(),!G7||!f)return;var W=e9(),X=Math.atan2(J5.x-W.x,J5.z-W.z),K=Math.atan2(f.position.x-W.x,f.position.z-W.z)+Math.PI,H=(X-K+Math.PI*3)%(Math.PI*2)-Math.PI;G7.style.transform="translateX(-50%) rotate("+Math.round(H*180/Math.PI)+"deg)",G7.style.display="block";var B=J5.x-W.x,O=J5.z-W.z;if(B*B+O*O<16)J5=null,G7.style.display="none"}function s1(W,X,K,H,B){if(!G)return;if(D7.length>=xW){C$("npc-max","muitos amigos (teto "+xW+")");return}var O=N0(W,"amigo"),D=JY(H,B),j={name:O,group:D.group,parts:D.parts,x:k(X,0),z:k(K,0),yaw:Math.random()*Math.PI*2,home:{x:k(X,0),z:k(K,0),r:0},target:null,waitT:1+Math.random()*2,phase:0,vis:0,emote:null};D.group.position.set(j.x,d9(j.x,j.z,null),j.z),G.add(D.group),D7.push(j),S$.push({x:j.x,z:j.z,r:2.6,label:"E: falar",prio:1,npcName:O,fire:function(){MH(O)}})}function jJ(W){for(var X=0;X<D7.length;X++)if(D7[X].name===W)return D7[X];return null}function jH(){if(P$||!M)return;var W=document.createElement("div");W.setAttribute("style","position:absolute;max-width:280px;padding:8px 12px;border-radius:14px;background:#ffffff;color:#0f172a;font:700 14px var(--sz-game-ui-font);transform:translate(-50%,-100%);pointer-events:none;z-index:8;box-shadow:0 4px 14px rgba(0,0,0,.3);display:none;"),M.appendChild(W),P$={el:W,name:"",text:"",shown:0,t:0}}function i1(W,X){if(jH(),!P$)return;P$.name=W,P$.text=String(X),P$.shown=0,P$.t=0,P$.el.style.display="block",P$.el.textContent=""}function CJ(W){var X=P7[W]||[];if(!X.length)return!1;var K=X.shift();if(K&&K.kind==="ask")CH(W,K);else i1(W,K&&K.text!=null?K.text:String(K));return!0}function CH(W,X){if(i1(W,X.q),!M)return;if(!H9){var K=document.createElement("div");K.setAttribute("style","position:absolute;display:flex;gap:8px;transform:translate(-50%,0);z-index:9;"),M.appendChild(K),H9={name:W,fa:null,fb:null,el:K}}H9.name=W,H9.fa=X.fa,H9.fb=X.fb,H9.el.innerHTML="";var H=["1· "+X.a,"2· "+X.b];for(var B=0;B<2;B++)(function(O){var D=document.createElement("button");D.textContent=H[O],D.setAttribute("style","padding:6px 12px;border-radius:12px;border:0;background:#22d3ee;color:#04252b;font:800 13px var(--sz-game-ui-font);cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.35)"),D.addEventListener("pointerdown",function(j){if(j&&j.preventDefault)j.preventDefault();T4(O)}),H9.el.appendChild(D)})(B);H9.el.style.display="flex"}function T4(W){if(!H9)return;var X=H9.name,K=W===0?H9.fa:H9.fb;if(H9.el.style.display="none",H9=null,typeof K==="function")try{K()}catch(H){C$("npc-ask-"+X,"erro na resposta de "+X+": "+H)}if(!CJ(X)){if(P$&&P$.name===X)P$.el.style.display="none"}}function MH(W){if(H9)return;var X=P7[W]||[];if(X.length){CJ(W);return}if(P$&&P$.name===W&&P$.el.style.display==="block"){P$.el.style.display="none";return}var K=UJ[W]||[];for(var H=0;H<K.length;H++)try{K[H]()}catch(O){C$("hook-npc-"+W,'erro no "Quando conversar com '+W+'": '+O)}var B=P7[W]||[];if(B.length&&(!P$||P$.el.style.display!=="block")&&!H9)CJ(W)}function vH(W){if(!D7.length)return;if(H9){if(R9("1"))T4(0);else if(R9("2"))T4(1)}var X=e9();for(var K=0;K<D7.length;K++){var H=D7[K],B=P$&&P$.name===H.name&&P$.el&&P$.el.style.display==="block",O=X.x-H.x,D=X.z-H.z,j=Math.sqrt(O*O+D*D),v=0;if(B||j<2.2)H.yaw=Math.atan2(O,D);else if(H.home.r>0.5)if(!H.target){if(H.waitT-=W,H.waitT<=0){var S=Math.random()*Math.PI*2,h=Math.sqrt(Math.random())*H.home.r;H.target={x:H.home.x+Math.cos(S)*h,z:H.home.z+Math.sin(S)*h}}}else{var p=H.target.x-H.x,c=H.target.z-H.z,$0=Math.sqrt(p*p+c*c);if($0<0.5)H.target=null,H.waitT=1+Math.random()*2.5;else H.yaw=Math.atan2(p,c),v=1.2,H.x+=p/$0*v*W,H.z+=c/$0*v*W}H.vis+=(v-H.vis)*Math.min(1,8*W),H.phase+=(2.2+H.vis*1.4)*W*(H.vis>0.1?1:0);var H0=Math.sin(H.phase*4)*Math.min(0.6,H.vis*0.4),E0=-H0*0.8,M0=0,m0=0;if(H.emote){if(H.emote.t-=W,H.emote.kind==="acenar")E0=-(2.4+Math.sin(r*10)*0.4);else if(H.emote.kind==="girar")M0=10*W;else if(H.emote.kind==="dancar")E0=-(1.2+Math.sin(r*8)),M0=Math.sin(r*6)*4*W;else if(H.emote.kind==="pular")m0=Math.abs(Math.sin((1.2-Math.max(0,H.emote.t))*6))*0.5;if(H.emote.t<=0)H.emote=null}H.yaw+=M0,H.group.position.set(H.x,d9(H.x,H.z,null)+m0,H.z),H.group.rotation.y=H.yaw,H.parts.legL.rotation.x=H0,H.parts.legR.rotation.x=-H0,H.parts.armL.rotation.x=E0,H.parts.armR.rotation.x=H0*0.8}for(var Z$=0;Z$<S$.length;Z$++){var y0=S$[Z$];if(!y0.npcName)continue;var u0=jJ(y0.npcName);if(u0)y0.x=u0.x,y0.z=u0.z,y0.promptY=d9(u0.x,u0.z,null)+2.2}if(P$&&P$.el.style.display==="block"){var V$=jJ(P$.name);if(V$&&f&&E9&&A){if(E9.set(V$.x,d9(V$.x,V$.z,null)+2.1,V$.z),E9.project(f),E9.z<1){var v$=A.getBoundingClientRect();if(P$.el.style.left=(E9.x*0.5+0.5)*v$.width+"px",P$.el.style.top=(-E9.y*0.5+0.5)*v$.height+"px",H9&&H9.el.style.display!=="none")H9.el.style.left=P$.el.style.left,H9.el.style.top=(-E9.y*0.5+0.5)*v$.height+10+"px"}}if(P$.shown<P$.text.length){P$.t+=W,Q4-=W;var K$=Math.min(P$.text.length,Math.floor(P$.t/0.03));if(K$>P$.shown){var h$=P$.text.charAt(P$.shown);if(P$.shown=K$,P$.el.textContent=P$.text.slice(0,P$.shown),Q4<=0&&h$!==" "){Q4=0.055;var E$=h$.charCodeAt(0)||97;j9(380+E$%23*22,0.045)}}}}}function a1(){if(!G||!VJ)return;if(q7){try{G.remove(q7)}catch(p){C$("remove-boat","não consegui remover o barco antigo: "+p)}LJ(q7,!0),q7=null}q7=new t$;var W=Q$({color:N0(VJ.color,"#f8fafc")}),X=new T0(new X9(2,0.7,4.4),W);X.position.y=0.35,X.castShadow=!0,q7.add(X);var K=new T0(new d8(1,1.4,4),W);K.rotation.x=Math.PI/2,K.rotation.y=Math.PI/4,K.position.set(0,0.35,2.8),q7.add(K);var H=new T0(new X9(1.2,0.7,1.2),Q$({color:"#94a3b8"}));if(H.position.set(0,1.05,-0.8),q7.add(H),!P9){var B=12,O=0;if(J0){var D=!1;for(var j=8;j<=J.world/2-4&&!D;j+=4)for(var v=0;v<12&&!D;v++){var S=Math.cos(v/12*Math.PI*2)*j,h=Math.sin(v/12*Math.PI*2)*j;if(h0(S,h)<J0.y-0.6)B=S,O=h,D=!0}}P9={x:B,z:O,yaw:0,speed:0,roll:0}}G.add(q7)}function AH(W){if(!P9||!q7)return;var X=P9,K=B9&&a8==="boat";if(K){var H=(m$("w")||m$("arrowup")?1:0)-(m$("s")||m$("arrowdown")?1:0),B=(m$("a")||m$("arrowleft")?1:0)-(m$("d")||m$("arrowright")?1:0);X.speed+=H*9*W,X.speed=f0(X.speed,-4,12),X.speed*=1-Math.min(1,0.5*W);var O=Math.min(1,Math.abs(X.speed)/3);X.yaw+=B*1.4*O*(X.speed>=0?1:-1)*W;var D=X.x+Math.sin(X.yaw)*X.speed*W,j=X.z+Math.cos(X.yaw)*X.speed*W;if(J0&&h0(D,j)<J0.y-0.35)X.x=D,X.z=j;else X.speed*=0.6;var v=J.world/2-2;X.x=f0(X.x,-v,v),X.z=f0(X.z,-v,v),X.roll+=(B*O*0.14-X.roll)*Math.min(1,5*W)}else X.speed*=1-Math.min(1,1.2*W),X.roll*=1-Math.min(1,2*W);var S=J0?J0.y:h0(X.x,X.z);if(X.y=S+0.05+Math.sin(r*1.7+X.x*0.2)*0.1,q7.position.set(X.x,X.y,X.z),q7.rotation.set(Math.sin(r*1.3)*0.02,X.yaw,X.roll),R$){if(!r8)r8={x:0,z:0,r:3.4,label:"E: barco",prio:2,fire:function(){ZY("boat")}},S$.push(r8);r8.x=X.x,r8.z=X.z,r8.r=B9?0:3.4,r8.promptY=S+2.2}}function r1(W,X,K,H,B){if(!G)return;var O={x1:k(W,0),z1:k(X,0),x2:k(K,20),z2:k(H,20),w:f0(k(B,4),2,12),y1:0,y2:0};O.y1=h0(O.x1,O.z1)+0.2,O.y2=h0(O.x2,O.z2)+0.2;var D=O.x2-O.x1,j=O.z2-O.z1,v=Math.sqrt(D*D+j*j)||1,S=Math.max(6,Math.round(v/0.9)),h=new X9(O.w,0.12,0.7),p=new r$(h,Q$({color:"#9a7b4f"}),S);if(p.castShadow=!0,p.frustumCulled=!1,!q0)q0=new o8;var c=Math.atan2(D,j);for(var $0=0;$0<S;$0++){var H0=$0/(S-1),E0=O.y1+(O.y2-O.y1)*H0+Math.sin(H0*Math.PI)*1.2;q0.position.set(O.x1+D*H0,E0,O.z1+j*H0),q0.rotation.set(0,c,0),q0.scale.set(1,1,1),q0.updateMatrix(),p.setMatrixAt($0,q0.matrix)}p.instanceMatrix.needsUpdate=!0,G.add(p),KQ.push(O)}function t1(W,X){if(!G)return;var K=k(W,0),H=k(X,0),B=h0(K,H),O=new t$;for(var D=0;D<4;D++){var j=new T0(new Q9(0.9-D*0.12,1.05-D*0.12,2.2,10),Q$({color:D%2?"#f8fafc":"#ef4444"}));j.position.y=1.1+D*2.2,j.castShadow=!0,O.add(j)}var v=new T0(new Q9(0.55,0.55,1,8),new Y9({color:"#fff7c2"}));v.position.y=9.4,O.add(v);var S=new Y9({color:"#fff3b0",transparent:!0,opacity:0,depthWrite:!1}),h=new L7(16,1.6),p=new T0(h,S);p.position.set(8,9.4,0);var c=new t$;c.position.y=0,c.add(p);var $0=p.clone();$0.position.set(-8,9.4,0),$0.rotation.y=Math.PI,c.add($0),O.add(c),O.position.set(K,B,H),G.add(O),M5.push({pivot:c,mat:S,x:K,z:H}),S0.push({x:K,z:H,r:4})}function TH(W){for(var X=0;X<M5.length;X++){var K=M5[X];K.pivot.rotation.y+=W*0.9,K.mat.opacity=a9*0.5}}function e1(){var W=TQ();if(!W||e8)return;try{var X=W.sampleRate*2,K=W.createBuffer(1,X,W.sampleRate),H=K.getChannelData(0);for(var B=0;B<X;B++)H[B]=(Math.random()*2-1)*0.5;var O=W.createBufferSource();O.buffer=K,O.loop=!0;var D=W.createBiquadFilter();D.type="lowpass",D.frequency.value=320;var j=W.createGain();j.gain.value=0.035,O.connect(D),D.connect(j),j.connect(W.destination),O.start(),e8={src:O,gain:j,filt:D}}catch(v){}}function $Y(){try{if(e8)e8.src.stop()}catch(W){}e8=null}function SH(W){if(t8==="desligado")return;if(t8==="mar"){if(e1(),e8)e8.filt.frequency.value=280+Math.sin(r*0.5)*120;return}if(KJ-=W,KJ>0)return;if(t8==="passaros"){if(KJ=2.5+Math.random()*4,a9<0.4)j9(1800+Math.random()*900,0.07),j9(2300+Math.random()*700,0.05)}else if(t8==="grilos"){if(KJ=0.4+Math.random()*0.4,a9>0.3)j9(4200,0.03)}}var hQ={bone:"#ef4444",palha:"#eab308",coroa:"#facc15",capacete:"#3b82f6"};function JY(W,X){var K=new t$,H={},B=Q$({color:"#f5c99b"}),O=Q$({color:N0(W,"#3b82f6")}),D=Q$({color:"#1f2937"}),j=new T0(new X9(0.5,0.55,0.3),O);j.position.y=0.95,j.castShadow=!0,K.add(j),H.body=j;var v=new T0(new X9(0.34,0.34,0.32),B);v.position.y=1.42,v.castShadow=!0,K.add(v),H.head=v;var S=N0(X,"nenhum");if(S!=="nenhum"&&hQ[S]){var h=Q$({color:hQ[S]}),p=S==="palha"?new T0(new Q9(0.34,0.34,0.06,10),h):S==="coroa"?new T0(new Q9(0.2,0.22,0.14,8),h):new T0(new X9(0.38,0.14,0.36),h);p.position.y=1.64,K.add(p)}var c=function($0,H0,E0,M0,m0){var Z$=new t$;Z$.position.set(E0,M0,0);var y0=new T0(new X9($0,H0,$0),m0);return y0.position.y=-H0/2,y0.castShadow=!0,Z$.add(y0),K.add(Z$),Z$};return H.armL=c(0.14,0.5,-0.34,1.18,O),H.armR=c(0.14,0.5,0.34,1.18,O),H.legL=c(0.16,0.62,-0.14,0.66,D),H.legR=c(0.16,0.62,0.14,0.66,D),{group:K,parts:H}}function S4(){if(!G||!R$)return;kH();var W=JY(R$.color,R$.hat);if(D9=W.group,X8=W.parts,N0(R$.acc,"nenhum")==="jetpack"){var X=new T0(new X9(0.34,0.44,0.16),Q$({color:"#64748b"}));X.position.set(0,1,-0.24),D9.add(X)}if(!B$){var K=n?n.x+3:2,H=n?n.z:2;B$={x:K,y:h0(K,H),z:H,yaw:0,vy:0,airborne:!1,vis:0,phase:0,speed:0}}D9.position.set(B$.x,B$.y,B$.z),D9.visible=!B9,G.add(D9)}function kH(){if(!D9)return;try{G.remove(D9)}catch(W){C$("remove-person","não consegui remover o personagem antigo: "+W)}LJ(D9,!0),D9=null,X8=null}function QY(W){var X=hW[W]||[];for(var K=0;K<X.length;K++)try{X[K]()}catch(H){C$("hook-veh-"+W+"-"+K,'erro no "Quando '+W+' do veículo": '+H)}}function ZY(W){if(!R$||B9)return;var X=W||"car";if(X==="car"&&!n)return;if(X==="boat"&&!P9)return;if(a8=X,B9=!0,D9)D9.visible=!1;l0=!0,QY("entrar")}function zH(){if(!R$||!B9)return;var W=a8==="boat"&&P9?P9:n;if(!W)return;if(B9=!1,!B$)B$={x:0,y:0,z:0,yaw:0,vy:0,airborne:!1,vis:0,phase:0,speed:0};if(B$.x=W.x+Math.cos(W.yaw)*2.4,B$.z=W.z-Math.sin(W.yaw)*2.4,B$.y=d9(B$.x,B$.z,null),B$.yaw=W.yaw,B$.vy=0,B$.airborne=!1,D9)D9.visible=!0,D9.position.set(B$.x,B$.y,B$.z);l0=!0,QY("sair")}function wH(W){if(!R$||!B$)return;var X=B$;if(n){if(!i8)i8={x:0,z:0,r:3,label:"E: entrar",prio:2,fire:function(){ZY("car")}},S$.push(i8);i8.x=n.x,i8.z=n.z,i8.r=B9?0:3,i8.promptY=n.y+2.6}if(B9){var K=a8==="boat"&&P9?P9:n;if(R9("e")&&K){var H=!1;for(var B=0;B<f$.length;B++){var O=K.x-f$[B].x,D=K.z-f$[B].z;if(O*O+D*D<f$[B].r*f$[B].r){H=!0;break}}for(var j=0;!H&&j<S$.length;j++){var v=S$[j];if(!v||v.r<=0)continue;var S=K.x-v.x,h=K.z-v.z;if(S*S+h*h<v.r*v.r)H=!0}if(!H)zH()}return}var p=k(R$.walk,4),c=k(R$.run,8),$0=k(R$.jump,7),H0=N0(R$.acc,"nenhum");if(H0==="botas")c*=1.8;var E0=(m$("w")||m$("arrowup")?1:0)-(m$("s")||m$("arrowdown")?1:0),M0=(m$("a")||m$("arrowleft")?1:0)-(m$("d")||m$("arrowright")?1:0),m0=m$("shift")||m$("shiftleft")||m$("shiftright"),Z$=E0*(m0?c:p);X.yaw+=M0*2.6*W,X.x+=Math.sin(X.yaw)*Z$*W,X.z+=Math.cos(X.yaw)*Z$*W,X.speed=Z$;var y0=nW(X.x,X.z,2.5);for(var u0=0;u0<y0.length;u0++){var V$=y0[u0],v$=X.x-V$.x,K$=X.z-V$.z,h$=V$.r+0.45,E$=v$*v$+K$*K$;if(E$>=h$*h$)continue;var i$=Math.sqrt(E$)||0.001;X.x+=v$/i$*(h$-i$),X.z+=K$/i$*(h$-i$)}var c$=J.world/2-1.5;X.x=f0(X.x,-c$,c$),X.z=f0(X.z,-c$,c$);var y9=d9(X.x,X.z,X.y);if(X.airborne){if(H0==="jetpack"&&m$(" ")){if(X.vy=Math.min(7,X.vy+26*W),aZ-=W,aZ<=0&&p$)aZ=0.05,EJ(X.x,X.y+0.4,X.z,(Math.random()-0.5)*1.5,-2.5,(Math.random()-0.5)*1.5,0.5,2,0,"#fde68a")}if(X.vy-=a0*U$*W,X.y+=X.vy*W,X.y<=y9)X.y=y9,X.vy=0,X.airborne=!1}else if(X.y=y9,R9(" ")){if(X.vy=$0,X.airborne=!0,H0==="jetpack")wQ()}if(J0&&J0.y-X.y>1.1){var g9=Q6||l;X.x=g9.x+1.5,X.z=g9.z+1.5,X.y=h0(X.x,X.z),X.vy=0,l0=!0}X.vis+=(Math.abs(Z$)-X.vis)*Math.min(1,8*W),X.phase+=(2.2+X.vis*1.4)*W*(X.vis>0.15?1:0);var n7=Math.sin(X.phase*4)*Math.min(0.7,X.vis*0.16),M7=0,Y5=0;if(j8){if(j8.t-=W,j8.kind==="acenar")M7=2.4+Math.sin(r*10)*0.4;else if(j8.kind==="girar")Y5=10*W;else if(j8.kind==="dancar")M7=1.2+Math.sin(r*8)*1,Y5=Math.sin(r*6)*4*W;if(j8.t<=0)j8=null}if(X.yaw+=Y5,D9&&X8){D9.position.set(X.x,X.y,X.z),D9.rotation.y=X.yaw,X8.legL.rotation.x=n7,X8.legR.rotation.x=-n7,X8.armL.rotation.x=M7?-M7:-n7*0.8,X8.armR.rotation.x=n7*0.8;var y5=Math.abs(Math.sin(X.phase*4))*Math.min(0.06,X.vis*0.02);X8.body.position.y=0.95+y5,X8.head.position.y=1.42+y5}}var _H=["varying vec2 vUv;","void main() {","  vUv = uv;","  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);","}"].join(" "),yH=["uniform float uTime;","varying vec2 vUv;","void main() {","  float s = fract(vUv.y * 3.0 + uTime * 1.4 + sin(vUv.x * 9.0) * 0.08);","  vec3 agua = vec3(0.55, 0.75, 0.9);","  vec3 col = mix(agua, vec3(1.0), smoothstep(0.62, 0.95, s) * 0.8);","  gl_FragColor = vec4(col, 0.85);","}"].join(" ");function XY(W,X,K,H){if(!G)return;var B=k(W,0),O=k(X,0),D=f0(k(K,8),3,30),j=new n8({uniforms:{uTime:{value:0}},vertexShader:_H,fragmentShader:yH,transparent:!0,side:m8?m8:void 0}),v=new T0(new L7(6,D),j),S=h0(B,O);v.position.set(B,S+D/2,O),v.rotation.y=k(H,0)*Math.PI/180,G.add(v);var h=26,p=new Float32Array(h*3);for(var c=0;c<h;c++)p[c*3]=B+(Math.random()-0.5)*5,p[c*3+1]=S+0.3+Math.random()*0.5,p[c*3+2]=O+(Math.random()-0.5)*2.4;var $0=new p9;$0.setAttribute("position",new z9(p,3));var H0=new w7({color:"#ffffff",size:0.7,transparent:!0,opacity:0.85,depthWrite:!1}),E0=_5();if(E0)H0.map=E0;var M0=new z7($0,H0);M0.frustumCulled=!1,G.add(M0),VQ.push({mesh:v,mat:j,foam:M0,x:B,z:O})}function fH(){for(var W=0;W<VQ.length;W++)VQ[W].mat.uniforms.uTime.value=r}function k4(W,X){if(!G)return;if(j5.length>=fW){C$("lamp-max","muitos postes (teto "+fW+")");return}var K=k(W,0),H=k(X,0),B=h0(K,H),O=new t$,D=new T0(new Q9(0.09,0.12,3.4,8),Q$({color:"#1f2937"}));D.position.y=1.7,D.castShadow=!0,O.add(D);var j=new Y9({color:"#6b7280"}),v=new T0(new D5(0.34,10,8),j);v.position.y=3.6,O.add(v),O.position.set(K,B,H),G.add(O),j5.push({x:K,z:H,globeMat:j})}function bH(){if(!j5.length)return;var W=a9>0.2;for(var X=0;X<j5.length;X++)j5[X].globeMat.color.set(W?"#ffe9a3":"#6b7280");if(!W){if(b7)for(var K=0;K<b7.length;K++)b7[K].intensity=0;return}if(!b7){b7=[];for(var H=0;H<4;H++){var B=new $Q(16771491,0,16);G.add(B),b7.push(B)}}var O=e9(),D=j5.slice().sort(function(S,h){var p=(S.x-O.x)*(S.x-O.x)+(S.z-O.z)*(S.z-O.z),c=(h.x-O.x)*(h.x-O.x)+(h.z-O.z)*(h.z-O.z);return p-c});for(var j=0;j<b7.length;j++){var v=D[j];if(v)b7[j].position.set(v.x,h0(v.x,v.z)+3.6,v.z),b7[j].intensity=1.4*a9;else b7[j].intensity=0}}var WY={pequena:28,media:38,grande:48},YY=["#f9c0c0","#fcd9a8","#fde68a","#bbf7d0","#bfdbfe","#ddd6fe","#f5d0fe","#fecdd3"],VY=["#22d3ee","#f472b6","#a3e635","#fb923c","#c084fc"],KY={casinha:{coll:2.3,wall:{g:"box",x:0,y:1.1,z:0,sx:3.4,sy:2.2,sz:3},parts:[{g:"pyr",color:"#c2553f",x:0,y:2.95,z:0,sx:4.4,sy:1.5,sz:4},{g:"box",color:"#3b2f26",x:0,y:0.85,z:1.53,sx:0.9,sy:1.7,sz:0.1},{g:"box",color:"#9cc3e8",x:-1.05,y:1.35,z:1.53,sx:0.8,sy:0.7,sz:0.08},{g:"box",color:"#9cc3e8",x:1.05,y:1.35,z:1.53,sx:0.8,sy:0.7,sz:0.08}]},sobrado:{coll:2.5,wall:{g:"box",x:0,y:2,z:0,sx:3.2,sy:4,sz:3.2},parts:[{g:"pyr",color:"#7c5cbf",x:0,y:4.55,z:0,sx:4.2,sy:1.2,sz:4.2},{g:"box",color:"#3b2f26",x:0,y:0.85,z:1.63,sx:0.9,sy:1.7,sz:0.1},{g:"box",color:"#9cc3e8",x:-0.9,y:3,z:1.63,sx:0.7,sy:0.8,sz:0.08},{g:"box",color:"#9cc3e8",x:0.9,y:3,z:1.63,sx:0.7,sy:0.8,sz:0.08}]},loja:{coll:2.6,wall:{g:"box",x:0,y:1.25,z:0,sx:4.2,sy:2.5,sz:3.2},parts:[{g:"box",color:"#4b5563",x:0,y:2.62,z:0,sx:4.4,sy:0.24,sz:3.4},{g:"box",color:"#ef6a6a",x:0,y:2.15,z:1.75,sx:3.6,sy:0.32,sz:0.9},{g:"box",color:"#dbeafe",x:0,y:1.05,z:1.63,sx:2.6,sy:1.5,sz:0.1},{g:"box",color:"#3b2f26",x:1.6,y:0.9,z:1.63,sx:0.8,sy:1.8,sz:0.1}]},predinho:{coll:2.6,wall:{g:"box",x:0,y:3,z:0,sx:3.6,sy:6,sz:3.6},parts:[{g:"box",color:"#4b5563",x:0,y:6.12,z:0,sx:3.8,sy:0.24,sz:3.8},{g:"box",color:"#9cc3e8",x:-0.95,y:2,z:1.83,sx:0.85,sy:3.4,sz:0.08},{g:"box",color:"#9cc3e8",x:0.95,y:2,z:1.83,sx:0.85,sy:3.4,sz:0.08},{g:"box",color:"#3b2f26",x:0,y:0.95,z:1.83,sx:1,sy:1.9,sz:0.1}]}};function C7(){if(CQ(),!j$.box)j$.box=new X9(1,1,1);if(!j$.pyr){var W=new d8(0.5,1,4);W.rotateY(Math.PI/4),j$.pyr=W}}function q6(W,X){return Math.atan2(-X,W)}function UY(){return{x:l9.x+Math.cos(3.93)*l9.r*0.42,z:l9.z+Math.sin(3.93)*l9.r*0.42}}function hH(){var W=l9,X=k8(W.x,W.z);t9.push({kind:"flatten",x:W.x,z:W.z,r:W.r+8,y:X}),S0.push({x:W.x,z:W.z,r:W.r+6});var K=W.r*0.62,H=Math.max(6,W.r*0.22),B=[],O=[];for(var D=0;D<4;D++){var j=D*Math.PI/2;B.push({ang:j,x:W.x+Math.cos(j)*H,z:W.z+Math.sin(j)*H}),O.push({ang:j,x:W.x+Math.cos(j)*K,z:W.z+Math.sin(j)*K})}if(s$={cx:W.x,cz:W.z,ringR:K,plazaR:H,roadW:5,entries:B,crossings:O},!J0){var v=UY();t9.push({kind:"flatten",x:v.x,z:v.z,r:6,y:X-1.4})}}function qY(W,X){W.push(X.r,X.g,X.b)}function xH(W){var X=s$,K=[],H=[],B=new y$("#3f4854"),O=new y$("#a8adb8"),D=new y$("#d9c9a3");function j(y0,u0,V$,v$,K$,h$,E$,i$,c$,y9){K.push(y0,c$,u0,V$,c$,v$,K$,c$,h$,y0,c$,u0,K$,c$,h$,E$,c$,i$);for(var g9=0;g9<6;g9++)qY(H,y9)}function v(y0,u0,V$,v$){var K$=48;for(var h$=0;h$<K$;h$++){var E$=h$/K$*Math.PI*2,i$=(h$+1)/K$*Math.PI*2;j(X.cx+Math.cos(E$)*y0,X.cz+Math.sin(E$)*y0,X.cx+Math.cos(E$)*u0,X.cz+Math.sin(E$)*u0,X.cx+Math.cos(i$)*u0,X.cz+Math.sin(i$)*u0,X.cx+Math.cos(i$)*y0,X.cz+Math.sin(i$)*y0,V$,v$)}}function S(y0,u0,V$,v$,K$){var h$=-Math.sin(y0),E$=Math.cos(y0),i$=X.plazaR-0.5,c$=X.ringR+X.roadW/2+1.4;j(X.cx+Math.cos(y0)*i$+h$*(u0-V$/2),X.cz+Math.sin(y0)*i$+E$*(u0-V$/2),X.cx+Math.cos(y0)*i$+h$*(u0+V$/2),X.cz+Math.sin(y0)*i$+E$*(u0+V$/2),X.cx+Math.cos(y0)*c$+h$*(u0+V$/2),X.cz+Math.sin(y0)*c$+E$*(u0+V$/2),X.cx+Math.cos(y0)*c$+h$*(u0-V$/2),X.cz+Math.sin(y0)*c$+E$*(u0-V$/2),v$,K$)}var h=32;for(var p=0;p<h;p++){var c=p/h*Math.PI*2,$0=(p+1)/h*Math.PI*2;K.push(X.cx,W+0.03,X.cz,X.cx+Math.cos(c)*X.plazaR,W+0.03,X.cz+Math.sin(c)*X.plazaR,X.cx+Math.cos($0)*X.plazaR,W+0.03,X.cz+Math.sin($0)*X.plazaR);for(var H0=0;H0<3;H0++)qY(H,D)}v(X.ringR-X.roadW/2-1.4,X.ringR-X.roadW/2,W+0.035,O),v(X.ringR-X.roadW/2,X.ringR+X.roadW/2,W+0.045,B),v(X.ringR+X.roadW/2,X.ringR+X.roadW/2+1.4,W+0.035,O);for(var E0=0;E0<4;E0++){var M0=X.entries[E0].ang;S(M0,0,X.roadW,W+0.044,B),S(M0,-(X.roadW/2+0.7),1.4,W+0.034,O),S(M0,X.roadW/2+0.7,1.4,W+0.034,O)}var m0=new p9;m0.setAttribute("position",new n5(K,3)),m0.setAttribute("color",new n5(H,3)),m0.computeVertexNormals();var Z$=new T0(m0,Q$({color:"#ffffff",vertexColors:!0}));Z$.receiveShadow=!0,T9.add(Z$)}function gH(W,X,K,H,B,O,D,j){q0.position.set(K,H,B),q0.rotation.set(0,O,0),q0.scale.set(D,1,j),q0.updateMatrix(),W.setMatrixAt(X,q0.matrix)}function uH(W){var X=s$;m9();var K=[],H=Math.floor(Math.PI*2*X.ringR/5);for(var B=0;B<H;B++){var O=B/H*Math.PI*2;K.push({x:X.cx+Math.cos(O)*X.ringR,z:X.cz+Math.sin(O)*X.ringR,yaw:q6(-Math.sin(O),Math.cos(O)),sx:1.5,sz:0.26})}for(var D=0;D<4;D++){var j=X.entries[D].ang,v=Math.cos(j),S=Math.sin(j);for(var h=X.plazaR+4.5;h<X.ringR-X.roadW/2-2.5;h+=4)K.push({x:X.cx+v*h,z:X.cz+S*h,yaw:q6(v,S),sx:1.5,sz:0.26});for(var p=0;p<5;p++){var c=X.plazaR+1.2+p*0.85;K.push({x:X.cx+v*c,z:X.cz+S*c,yaw:q6(-S,v),sx:3.8,sz:0.42});var $0=X.ringR-X.roadW/2-1.4-p*0.85;K.push({x:X.cx+v*$0,z:X.cz+S*$0,yaw:q6(-S,v),sx:3.8,sz:0.42})}}var H0=new L7(1,1);H0.rotateX(-Math.PI/2);var E0=new r$(H0,new Y9({color:"#e5e7eb"}),K.length);for(var M0=0;M0<K.length;M0++)gH(E0,M0,K[M0].x,W+0.06,K[M0].z,K[M0].yaw,K[M0].sx,K[M0].sz);E0.instanceMatrix.needsUpdate=!0,T9.add(E0)}function pH(){var W=s$,X=l9.size==="pequena"?10:l9.size==="grande"?18:14,K=H7(808+Math.round(l9.x*7+l9.z*13)),H=[],B=W.ringR+W.roadW/2+4.6;for(var O=0;O<X;O++){var D=O/X*Math.PI*2+0.14,j=!1;for(var v=0;v<4;v++){var S=Math.abs(Math.atan2(Math.sin(D-W.entries[v].ang),Math.cos(D-W.entries[v].ang)));if(S<0.3)j=!0}if(j)continue;var h=W.cx+Math.cos(D)*B,p=W.cz+Math.sin(D)*B,c=Math.atan2(W.cx-h,W.cz-p);H.push({x:h,z:p,yaw:c,color:YY[Math.floor(K()*YY.length)]})}return H}function HY(W){var X=new L8;return X.compose(new M9(W.x||0,W.y||0,W.z||0),new i5,new M9(W.sx||1,W.sy||1,W.sz||1)),X}function lH(W,X){if(!W.length)return;C7(),m9();var K=["casinha","loja","sobrado","casinha","predinho","loja"],H={};for(var B=0;B<W.length;B++){var O=K[B%K.length];if(!H[O])H[O]=[];H[O].push(W[B]),F7(W[B].x,W[B].z,KY[O].coll),W[B].arch=O}for(var D in H){var j=KY[D],v=H[D],S=HY(j.wall),h=new r$(j$[j.wall.g],Q$({color:"#ffffff"}),v.length);h.castShadow=!0;for(var p=0;p<v.length;p++){var c=v[p];L4(h,p,c.x,h0(c.x,c.z),c.z,c.yaw,1,S),h.setColorAt(p,new y$(c.color))}if(h.instanceMatrix.needsUpdate=!0,h.instanceColor)h.instanceColor.needsUpdate=!0;T9.add(h);for(var $0=0;$0<j.parts.length;$0++){var H0=j.parts[$0],E0=HY(H0),M0=new r$(j$[H0.g],x9(H0.color),v.length);M0.castShadow=!0;for(var m0=0;m0<v.length;m0++)L4(M0,m0,v[m0].x,h0(v[m0].x,v[m0].z),v[m0].z,v[m0].yaw,1,E0);M0.instanceMatrix.needsUpdate=!0,T9.add(M0)}}}function dH(W){var X=s$;C7(),m9();var K=[],H=X.plazaR+1.6,B=Math.floor(Math.PI*2*H/1.9);for(var O=0;O<B;O++){var D=O/B*Math.PI*2,j=!1;for(var v=0;v<4;v++){var S=Math.abs(Math.atan2(Math.sin(D-X.entries[v].ang),Math.cos(D-X.entries[v].ang)));if(S<0.42)j=!0}if(j)continue;K.push({x:X.cx+Math.cos(D)*H,z:X.cz+Math.sin(D)*H,yaw:q6(-Math.sin(D),Math.cos(D))})}if(!K.length)return;var h=new r$(j$.box,x9("#2f7a3a"),K.length);h.castShadow=!0;for(var p=0;p<K.length;p++)q0.position.set(K[p].x,W+0.45,K[p].z),q0.rotation.set(0,K[p].yaw,0),q0.scale.set(1.7,0.9,0.7),q0.updateMatrix(),h.setMatrixAt(p,q0.matrix);h.instanceMatrix.needsUpdate=!0,T9.add(h)}function mH(W){var X=s$,K=new T0(new Q9(X.plazaR*0.34,X.plazaR*0.38,0.5,12),Q$({color:"#c9a06a"}));K.position.set(X.cx,W+0.25,X.cz),K.castShadow=!0,T9.add(K);var H=new Q9(0.09,0.09,2.6,6),B=Q$({color:"#7a5a38"});for(var O=0;O<4;O++){var D=O/4*Math.PI*2+Math.PI/4,j=new T0(H,B);j.position.set(X.cx+Math.cos(D)*X.plazaR*0.26,W+1.7,X.cz+Math.sin(D)*X.plazaR*0.26),T9.add(j)}var v=new T0(new d8(X.plazaR*0.4,1.4,8),Q$({color:"#b8543f"}));v.position.set(X.cx,W+3.6,X.cz),v.castShadow=!0,T9.add(v),F7(X.cx,X.cz,X.plazaR*0.4)}function z4(W,X,K,H){if(!G)return;var B=T9||G,O=h0(W,X),D=h0(K,H),j=new Q9(0.07,0.09,3.1,6),v=Q$({color:"#334155"}),S=new T0(j,v);S.position.set(W,O+1.55,X),B.add(S);var h=new T0(j,v);h.position.set(K,D+1.55,H),B.add(h);var p=O+3,c=D+3,$0=Math.sqrt((K-W)*(K-W)+(H-X)*(H-X)),H0=Math.min(1.1,0.35+$0*0.05),E0=14,M0=[],m0=[];for(var Z$=0;Z$<E0;Z$++){var y0=Z$/E0,u0=(Z$+1)/E0,V$=W+(K-W)*y0,v$=X+(H-X)*y0,K$=p+(c-p)*y0-H0*4*y0*(1-y0),h$=W+(K-W)*u0,E$=X+(H-X)*u0,i$=p+(c-p)*u0-H0*4*u0*(1-u0);if(M0.push(V$,K$,v$,h$,i$,E$),Z$>0)m0.push(V$,K$-0.12,v$)}var c$=new p9;c$.setAttribute("position",new n5(M0,3)),B.add(new n6(c$,new o6({color:"#1f2937"})));var y9=new p9;y9.setAttribute("position",new n5(m0,3));var g9=new w7({map:_5(),color:"#ffe9a3",size:0.55,transparent:!0,opacity:0.25,depthWrite:!1,sizeAttenuation:!0}),n7=new z7(y9,g9);n7.frustumCulled=!1,B.add(n7),XJ.push({bulbsMat:g9})}function cH(){if(!XJ.length)return;var W=0.22+a9*0.78;for(var X=0;X<XJ.length;X++)XJ[X].bulbsMat.opacity=W}function oH(W){var X=UY(),K=new kZ(5.2,20);K.rotateX(-Math.PI/2);var H=new T0(K,new Y9({color:"#2b6cb0",transparent:!0,opacity:0.9}));H.position.set(X.x,W-0.55,X.z),T9.add(H)}function nH(W,X){m9();var K=[];for(var H=0;H<W.length;H++)if(W[H].arch==="loja"||W[H].arch==="predinho")K.push(W[H]);if(!K.length)return;var B=new L7(1,1),O=new r$(B,new Y9({color:"#ffffff"}),K.length);for(var D=0;D<K.length;D++){var j=K[D],v=j.arch==="predinho"?1.95:1.75,S=j.x+Math.sin(j.yaw)*v,h=j.z+Math.cos(j.yaw)*v;q0.position.set(S,h0(j.x,j.z)+(j.arch==="predinho"?5.4:2.95),h),q0.rotation.set(0,j.yaw,0),q0.scale.set(2.3,0.62,1),q0.updateMatrix(),O.setMatrixAt(D,q0.matrix),O.setColorAt(D,new y$(VY[D%VY.length]))}if(O.instanceMatrix.needsUpdate=!0,O.instanceColor)O.instanceColor.needsUpdate=!0;T9.add(O)}function FY(){if(h7)h7.style.display="none";UQ=!1}function sH(W){if(!K6())return;if(!h7)h7=document.createElement("div"),h7.setAttribute("style","position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,10,16,.82);z-index:9;cursor:pointer"),h7.addEventListener("click",function(){FY()}),M.appendChild(h7);h7.innerHTML="";var X=document.createElement("div");X.setAttribute("style","max-width:420px;width:86%;background:#fffef8;border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 44px rgba(0,0,0,.5)");var K=document.createElement("div");K.setAttribute("style","font:800 22px var(--sz-game-ui-font);color:#0f172a"),K.textContent=W.title||"Porta",X.appendChild(K);var H=U4[N0(W.image,"")];if(H){var B=document.createElement("img");B.src=H,B.setAttribute("style","width:100%;max-height:200px;object-fit:contain;border-radius:10px"),X.appendChild(B)}var O=document.createElement("div");O.setAttribute("style","font:500 15px var(--sz-game-ui-font);color:#334155;white-space:pre-wrap"),O.textContent=W.body||"",X.appendChild(O);var D=document.createElement("div");D.setAttribute("style","font:400 12px var(--sz-game-ui-font);color:#94a3b8"),D.textContent="E ou clique para fechar",X.appendChild(D),h7.appendChild(X),h7.style.display="flex",UQ=!0,N={}}function BY(W){if(!G)return;if(rZ.length>=16){C$("door-max","muitas portas (teto 16)");return}var X=k(W.x,0),K=k(W.z,0),H=k(W.deg,0)*Math.PI/180,B=d9(X,K,null),O=new t$,D=Q$({color:"#7a5a38"}),j=new X9(0.18,2.3,0.22),v=new T0(j,D);v.position.set(-0.62,1.15,0),O.add(v);var S=new T0(j,D);S.position.set(0.62,1.15,0),O.add(S);var h=new T0(new X9(1.42,0.2,0.22),D);h.position.set(0,2.35,0),O.add(h);var p=new T0(new X9(1.06,2.2,0.1),Q$({color:"#b8543f"}));p.position.set(0,1.1,0),p.castShadow=!0,O.add(p);var c=new T0(new D5(0.06,8,6),new Y9({color:"#fbbf24"}));if(c.position.set(0.38,1.05,0.09),O.add(c),W.title){var $0=N1(W.title,""),H0=new T0(new L7(1.7,0.55),new Y9({map:$0,transparent:!0}));H0.position.set(0,2.85,0.02),O.add(H0)}O.position.set(X,B,K),O.rotation.y=H,G.add(O),F7(X,K,0.7),rZ.push(W),S$.push({x:X,z:K,r:2.6,label:"E: abrir",prio:1,promptY:B+2.6,fire:function(){sH(W)}})}var w4={milho:{plant:"#d9c24a",tall:1.1,ball:!1},alface:{plant:"#5fbf5a",tall:0.4,ball:!0},abobora:{plant:"#e8842f",tall:0.42,ball:!0}};function NY(W){if(!G)return;C7(),m9();var X=w4[W.kindName]||w4.milho,K=f0(k(W.n,4),1,10),H=8,B=k(W.x,0),O=k(W.z,20),D=new r$(j$.box,x9("#6b4a2f"),K*H),j=X.ball?j$.sph:j$.cone,v=new r$(j,x9(X.plant),K*H);v.castShadow=!0;var S=0;for(var h=0;h<K;h++)for(var p=0;p<H;p++){var c=B+(p-H/2)*1.2,$0=O+h*1.6,H0=h0(c,$0);q0.position.set(c,H0+0.12,$0),q0.rotation.set(0,0,0),q0.scale.set(0.9,0.24,0.9),q0.updateMatrix(),D.setMatrixAt(S,q0.matrix),q0.position.set(c,H0+0.24+X.tall/2,$0),q0.scale.set(X.ball?0.55:0.3,X.tall,X.ball?0.55:0.3),q0.updateMatrix(),v.setMatrixAt(S,q0.matrix),S++}D.instanceMatrix.needsUpdate=!0,v.instanceMatrix.needsUpdate=!0,G.add(D),G.add(v),S0.push({x:B,z:O+K*0.8,r:Math.max(H*0.7,K*0.9)+2})}function OY(W){if(!G)return;var X=k(W.x,0),K=k(W.z,0),H=k(W.deg,0)*Math.PI/180,B=h0(X,K);C7();var O=new t$,D=new T0(j$.box,Q$({color:"#b4432f"}));D.scale.set(6,3.4,4.6),D.position.y=1.7,D.castShadow=!0,O.add(D);var j=new T0(j$.pyr,Q$({color:"#7a4a30"}));j.scale.set(7,2,5.4),j.position.y=4.4,j.castShadow=!0,O.add(j);var v=new T0(j$.box,Q$({color:"#f5efe0"}));v.scale.set(1.8,2.2,0.12),v.position.set(0,1.1,2.32),O.add(v);var S=new T0(j$.box,Q$({color:"#f5efe0"}));S.scale.set(6.2,0.3,4.8),S.position.y=3.35,O.add(S),O.position.set(X,B,K),O.rotation.y=H,G.add(O),F7(X,K,3.4)}function LY(W){if(!G)return;var X=k(W.x,0),K=k(W.z,0),H=h0(X,K),B=new t$,O=new T0(new Q9(0.5,1.1,7,8),Q$({color:"#e8e0cc"}));O.position.y=3.5,O.castShadow=!0,B.add(O);var D=new T0(new d8(0.9,1,8),Q$({color:"#b4432f"}));D.position.y=7.4,B.add(D);var j=new t$,v=Q$({color:"#f5efe0"});C7();for(var S=0;S<4;S++){var h=new T0(j$.box,v);h.scale.set(0.5,3.2,0.08),h.position.y=1.7;var p=new t$;p.rotation.z=S/4*Math.PI*2,p.add(h),j.add(p)}j.position.set(0,6.6,1.15),B.add(j),B.position.set(X,H,K),G.add(B),F7(X,K,1.2),qJ.push({blades:j})}function iH(W){if(!qJ.length)return;var X=(0.5+z5*0.5)*W;for(var K=0;K<qJ.length;K++)qJ[K].blades.rotation.z+=X}function IY(W){if(!G)return;C7(),m9();var X=k(W.x1,-8),K=k(W.z1,0),H=k(W.x2,8),B=k(W.z2,0),O=Math.sqrt((H-X)*(H-X)+(B-K)*(B-K)),D=Math.min(48,Math.max(2,Math.floor(O/1.6)+1));if(eZ+D>256){C$("fence-max","muita cerquinha (teto 256 postes)");return}eZ+=D;var j=q6(H-X,B-K),v=new r$(j$.cyl,x9("#8a6a3f"),D),S=new r$(j$.box,x9("#a8814f"),(D-1)*2);v.castShadow=!0;var h=0;for(var p=0;p<D;p++){var c=D===1?0:p/(D-1),$0=X+(H-X)*c,H0=K+(B-K)*c,E0=h0($0,H0);if(q0.position.set($0,E0+0.55,H0),q0.rotation.set(0,0,0),q0.scale.set(0.16,1.1,0.16),q0.updateMatrix(),v.setMatrixAt(p,q0.matrix),F7($0,H0,0.25),p<D-1){var M0=D===1?0:(p+0.5)/(D-1),m0=X+(H-X)*M0,Z$=K+(B-K)*M0,y0=(E0+h0(X+(H-X)*((p+1)/(D-1)),K+(B-K)*((p+1)/(D-1))))/2;for(var u0=0;u0<2;u0++)q0.position.set(m0,y0+0.45+u0*0.35,Z$),q0.rotation.set(0,j,0),q0.scale.set(O/(D-1)+0.1,0.09,0.07),q0.updateMatrix(),S.setMatrixAt(h++,q0.matrix)}}v.instanceMatrix.needsUpdate=!0,S.instanceMatrix.needsUpdate=!0,G.add(v),G.add(S)}var _4={galinhas:{body:"#f5efe0",head:"#e04f3f",s:0.45,speed:1.4},vacas:{body:"#f5efe0",head:"#3b2f26",s:1,speed:0.9}};function DY(W){if(!G)return;var X=_4[W.kindName]||_4.galinhas,K=Math.max(0,16-tZ),H=Math.min(K,f0(k(W.n,4),1,16));if(H<=0){C$("animal-max","muitos bichinhos (teto 16)");return}tZ+=H,C7(),m9();var B=new r$(j$.sph,x9(X.body),H),O=new r$(j$.sph,x9(X.head),H);B.castShadow=!0,G.add(B),G.add(O);var D=H7(Math.round(k(W.x,0)*3+k(W.z,0)*5)+77),j={body:B,head:O,kind:X,list:[]};for(var v=0;v<H;v++)j.list.push({x:k(W.x,0)+(D()*2-1)*k(W.r,8),z:k(W.z,0)+(D()*2-1)*k(W.r,8),yaw:D()*Math.PI*2,home:{x:k(W.x,0),z:k(W.z,0),r:f0(k(W.r,8),2,40)},target:null,waitT:D()*2,phase:D()*6});HJ.push(j)}function aH(W){if(!HJ.length)return;m9();for(var X=0;X<HJ.length;X++){var K=HJ[X];for(var H=0;H<K.list.length;H++){var B=K.list[H];B.phase+=W*4;var O=0;if(B.target){var D=B.target.x-B.x,j=B.target.z-B.z,v=Math.sqrt(D*D+j*j);if(v<0.4)B.target=null,B.waitT=1+Math.random()*3;else B.yaw=Math.atan2(D,j),O=K.kind.speed,B.x+=D/v*O*W,B.z+=j/v*O*W}else if(B.waitT-=W,B.waitT<=0){var S=Math.random()*Math.PI*2,h=Math.sqrt(Math.random())*B.home.r;B.target={x:B.home.x+Math.cos(S)*h,z:B.home.z+Math.sin(S)*h}}var p=h0(B.x,B.z),c=K.kind.s,$0=O>0?0:Math.max(0,Math.sin(B.phase))*0.12*c;q0.position.set(B.x,p+0.42*c,B.z),q0.rotation.set(0,B.yaw,0),q0.scale.set(0.8*c,0.7*c,1.1*c),q0.updateMatrix(),K.body.setMatrixAt(H,q0.matrix),q0.position.set(B.x+Math.sin(B.yaw)*0.5*c,p+0.78*c-$0,B.z+Math.cos(B.yaw)*0.5*c),q0.scale.set(0.34*c,0.34*c,0.34*c),q0.updateMatrix(),K.head.setMatrixAt(H,q0.matrix)}K.body.instanceMatrix.needsUpdate=!0,K.head.instanceMatrix.needsUpdate=!0}}function PY(W){if(!G)return;if($4>=8){C$("flag-max","muitas bandeiras (teto 8)");return}$4++;var X=k(W.x,0),K=k(W.z,0),H=h0(X,K),B=new t$,O=new T0(new Q9(0.05,0.06,2.6,6),Q$({color:"#d8dde6"}));O.position.y=1.3,B.add(O);var D=new T0(new L7(1.1,0.65),new Y9({color:W.color||"#ef4444",side:m8}));D.position.set(0.6,2.2,0),B.add(D),B.position.set(X,H,K),G.add(B)}function GY(W){if(!G)return;if(J4>=8){C$("rocket-max","muitos foguetes (teto 8)");return}J4++;var X=k(W.x,0),K=k(W.z,0),H=h0(X,K),B=new t$,O=Q$({color:"#e8e8f0"}),D=new T0(new Q9(0.9,0.9,4.2,12),O);D.position.y=3.1,D.castShadow=!0,B.add(D);var j=new T0(new d8(0.9,1.6,12),Q$({color:"#e04f3f"}));j.position.y=6,B.add(j);var v=new Y9({color:"#9cc3e8"}),S=new T0(new D5(0.34,10,8),v);S.position.set(0,3.8,0.82),B.add(S),C7();var h=Q$({color:"#e04f3f"});for(var p=0;p<4;p++){var c=p/4*Math.PI*2,$0=new T0(j$.box,h);$0.scale.set(0.16,1.6,1),$0.position.set(Math.cos(c)*1.1,1.2,Math.sin(c)*1.1),$0.rotation.y=-c,B.add($0)}B.position.set(X,H,K),G.add(B),F7(X,K,1.4)}var EY=["#ef4444","#3b82f6","#f59e0b","#10b981","#a855f7","#f97316"],W5=[{g:"box",x:0,y:0.34,z:0,sx:1.3,sy:0.42,sz:2.3,tint:!0},{g:"box",color:"#dbeafe",x:0,y:0.66,z:-0.15,sx:1.05,sy:0.34,sz:1.2},{g:"box",color:"#111827",x:0,y:0.16,z:0.75,sx:1.36,sy:0.3,sz:0.34},{g:"box",color:"#111827",x:0,y:0.16,z:-0.75,sx:1.36,sy:0.3,sz:0.34}];function RY(W){return s$.ringR+(W===0?1.25:-1.25)}function jY(){if(!s$){z0('o trânsito precisa da cidadezinha — use "Construir a cidadezinha" antes'),C5=null;return}C7(),m9();var W=C5.n;f7=[];for(var X=0;X<W;X++)f7.push({lane:X%2,a:X/W*Math.PI*2,speed:0,hornCd:0,blockT:0});Z8=new r$(j$.box,Q$({color:"#ffffff"}),W*W5.length),Z8.castShadow=!0;for(var K=0;K<W;K++){var H=new y$(EY[K%EY.length]);for(var B=0;B<W5.length;B++)Z8.setColorAt(K*W5.length+B,W5[B].tint?H:new y$(W5[B].color))}if(Z8.instanceColor)Z8.instanceColor.needsUpdate=!0;if((T9||G).add(Z8),C5.sem)rH();MY()}function rH(){var W=s$;m9();var X=new Q9(0.07,0.09,3.2,6),K=Q$({color:"#374151"}),H=new r$(new X9(0.3,0.3,0.18),new Y9({color:"#ffffff"}),W.crossings.length*3);for(var B=0;B<W.crossings.length;B++){var O=W.crossings[B],D=O.x+Math.cos(O.ang)*3.4-Math.sin(O.ang)*3.4,j=O.z+Math.sin(O.ang)*3.4+Math.cos(O.ang)*3.4,v=new T0(X,K),S=h0(D,j);v.position.set(D,S+1.6,j),(T9||G).add(v);for(var h=0;h<3;h++)q0.position.set(D,S+3-h*0.36,j),q0.rotation.set(0,O.ang+Math.PI/2,0),q0.scale.set(1,1,1),q0.updateMatrix(),H.setMatrixAt(B*3+h,q0.matrix)}H.instanceMatrix.needsUpdate=!0,(T9||G).add(H),L9={t:0,phase:"anda",bulbMesh:H},CY()}function CY(){if(!L9||!L9.bulbMesh)return;var W=L9.phase,X=new y$(W==="para"?"#ef4444":"#3f1d1d"),K=new y$(W==="amarelo"?"#fbbf24":"#3f351d"),H=new y$(W==="anda"?"#22c55e":"#1d3f28"),B=L9.bulbMesh.count/3;for(var O=0;O<B;O++)L9.bulbMesh.setColorAt(O*3+0,X),L9.bulbMesh.setColorAt(O*3+1,K),L9.bulbMesh.setColorAt(O*3+2,H);if(L9.bulbMesh.instanceColor)L9.bulbMesh.instanceColor.needsUpdate=!0}function y4(W,X,K){var H=(X-W)*K;if(H=H%(Math.PI*2),H<0)H+=Math.PI*2;return H}function tH(W){if(!C5||!f7.length||!s$)return;var X=s$;if(L9){L9.t+=W;var K=L9.phase==="anda"?8:L9.phase==="amarelo"?1.5:5;if(L9.t>=K)L9.t=0,L9.phase=L9.phase==="anda"?"amarelo":L9.phase==="amarelo"?"para":"anda",CY()}var H=e9();for(var B=0;B<f7.length;B++){var O=f7[B],D=RY(O.lane),j=O.lane===0?1:-1,v=999;for(var S=0;S<f7.length;S++){if(S===B||f7[S].lane!==O.lane)continue;var h=y4(O.a,f7[S].a,j)*D;if(h>0.5&&h<v)v=h}var p=Math.sqrt((H.x-X.cx)*(H.x-X.cx)+(H.z-X.cz)*(H.z-X.cz));if(Math.abs(p-D)<2.2){var c=Math.atan2(H.z-X.cz,H.x-X.cx),$0=y4(O.a,c,j)*D;if($0>0.2&&$0<v){if(v=$0,$0<6){if(O.blockT+=W,O.blockT>2&&O.hornCd<=0)j9(240,0.12),O.hornCd=3}}}else if(O.blockT>0)O.blockT=0;if(O.hornCd=Math.max(0,O.hornCd-W),L9&&L9.phase!=="anda")for(var H0=0;H0<X.crossings.length;H0++){var E0=X.crossings[H0].ang,M0=y4(O.a,E0-j*(2.8/D),j)*D;if(M0>0.2&&M0<v)v=M0}var m0=v>10?5:v>2.4?Math.max(0,(v-2.4)*0.7):0;O.speed+=(m0-O.speed)*O4(6,W),O.a+=O.speed*W*j/D}MY()}function MY(){if(!Z8||!s$)return;m9();var W=s$,X=h0(W.cx,W.cz);for(var K=0;K<f7.length;K++){var H=f7[K],B=RY(H.lane),O=H.lane===0?1:-1,D=W.cx+Math.cos(H.a)*B,j=W.cz+Math.sin(H.a)*B,v=-Math.sin(H.a)*O,S=Math.cos(H.a)*O,h=Math.atan2(v,S);for(var p=0;p<W5.length;p++){var c=W5[p];q0.position.set(D+Math.sin(h)*(c.z||0)+Math.cos(h)*(c.x||0),X+0.06+(c.y||0),j+Math.cos(h)*(c.z||0)-Math.sin(h)*(c.x||0)),q0.rotation.set(0,h,0),q0.scale.set(c.sx||1,c.sy||1,c.sz||1),q0.updateMatrix(),Z8.setMatrixAt(K*W5.length+p,q0.matrix)}}Z8.instanceMatrix.needsUpdate=!0}function vY(){if(!G||!l9||!s$)return;if(T9)try{G.remove(T9)}catch(h){}T9=new t$,G.add(T9);var W=s$,X=h0(W.cx,W.cz);xH(X),uH(X);var K=pH();lH(K,X),dH(X),mH(X);for(var H=0;H<W.crossings.length;H++)k4(W.crossings[H].x+3.4,W.crossings[H].z+3.4);var B=[];for(var O=0;O<4;O++){var D=O/4*Math.PI*2+Math.PI/4;B.push({x:W.cx+Math.cos(D)*(W.plazaR-0.8),z:W.cz+Math.sin(D)*(W.plazaR-0.8)})}for(var j=0;j<4;j++){var v=B[j],S=B[(j+1)%4];z4(v.x,v.z,S.x,S.z)}if(!J0)oH(X);if(l9.mode==="neon")nH(K,X)}var f4={residencial:["#f7c9b5","#f6d7a7","#bfe3d0","#bdd7ee"],comercial:["#f59e0b","#22c55e","#38bdf8","#f472b6"],educacao:["#f4c95d","#e07a5f","#81b29a","#3d5a80"],saude:["#f8fafc","#dbeafe","#bfdbfe","#fecaca"],industrial:["#64748b","#94a3b8","#78716c","#a8a29e"],turistico:["#fb7185","#fbbf24","#2dd4bf","#60a5fa"]},b4={coloridas:["#fb7185","#fbbf24","#34d399","#60a5fa","#c084fc"],praia:["#fef3c7","#bae6fd","#fecdd3","#ccfbf1"],modernas:["#f8fafc","#cbd5e1","#64748b","#1e293b"],campo:["#f5deb3","#d6b98c","#b7c99d","#e8c07d"]};function AY(W){var X=k(W.x,0),K=k(W.z,0),H=f0(k(W.size,80),20,240),B=H*0.5,O=N0(W.layout,"grade"),D=[];if(O==="radial"){for(var j=0;j<6;j++){var v=j*Math.PI/3;D.push({x1:X,z1:K,x2:X+Math.cos(v)*B,z2:K+Math.sin(v)*B})}return D}if(O==="organica")return D.push({x1:X-B,z1:K-H*0.18,x2:X+B,z2:K+H*0.12}),D.push({x1:X-B,z1:K+H*0.28,x2:X+B,z2:K+H*0.18}),D.push({x1:X-H*0.22,z1:K-B,x2:X+H*0.08,z2:K+B}),D.push({x1:X+H*0.3,z1:K-B,x2:X+H*0.18,z2:K+B}),D;for(var S=-1;S<=1;S++){var h=S*H/3;D.push({x1:X-B,z1:K+h,x2:X+B,z2:K+h}),D.push({x1:X+h,z1:K-B,x2:X+h,z2:K+B})}return D}function eH(W){var X=AY(W),K=f0(k(W.width,6),2,18);for(var H=0;H<X.length;H++){var B=X[H];t9.push({kind:"path",x1:B.x1,z1:B.z1,x2:B.x2,z2:B.z2,w:K,y1:k8(B.x1,B.z1),y2:k8(B.x2,B.z2)})}}function TY(W){if(!G)return;C7(),m9();var X=AY(W),K=f0(k(W.width,6),2,18),H=[];for(var B=0;B<X.length;B++){var O=X[B],D=O.x2-O.x1,j=O.z2-O.z1,v=Math.sqrt(D*D+j*j),S=Math.max(1,Math.ceil(v/8));for(var h=0;h<S;h++){var p=h/S,c=(h+1)/S,$0=O.x1+D*(p+c)*0.5,H0=O.z1+j*(p+c)*0.5;H.push({x:$0,z:H0,len:v/S,yaw:Math.atan2(D,j)})}}var E0=new r$(j$.box,x9("#3f4854"),H.length),M0=new r$(j$.box,x9("#f8fafc"),H.length);E0.receiveShadow=!0;for(var m0=0;m0<H.length;m0++){var Z$=H[m0],y0=h0(Z$.x,Z$.z);q0.position.set(Z$.x,y0+0.045,Z$.z),q0.rotation.set(0,Z$.yaw,0),q0.scale.set(K,0.08,Z$.len+0.15),q0.updateMatrix(),E0.setMatrixAt(m0,q0.matrix),q0.position.y=y0+0.09,q0.scale.set(0.13,0.03,Math.min(2.4,Z$.len*0.55)),q0.updateMatrix(),M0.setMatrixAt(m0,q0.matrix)}E0.instanceMatrix.needsUpdate=!0,M0.instanceMatrix.needsUpdate=!0,G.add(E0),G.add(M0)}function SY(W){if(!G)return;C7(),m9();var X=N0(W.districtKind||W.kind,"residencial"),K=f4[X]||f4.residencial,H=k(W.x,0),B=k(W.z,0),O=f0(k(W.size,48),20,120),D=K9.tier==="turbo"?9:16,j=Math.round(Math.sqrt(D)),v=O/j,S=[],h=H7(1701+Math.round(H*17+B*29+O));for(var p=0;p<j;p++)for(var c=0;c<j;c++){var $0=H+(c-(j-1)*0.5)*v,H0=B+(p-(j-1)*0.5)*v,E0=X==="comercial"||X==="industrial",M0=(E0?5:3)+h()*(E0?9:4);if(X==="educacao")M0=3.5+h()*2;if(X==="saude")M0=4+h()*3;var m0=v*(0.48+h()*0.16),Z$=v*(0.48+h()*0.16);S.push({x:$0,z:H0,y:h0($0,H0),w:m0,d:Z$,h:M0,color:K[(p*j+c)%K.length]}),F7($0,H0,Math.max(m0,Z$)*0.48)}var y0=new r$(j$.box,Q$({color:"#ffffff"}),S.length),u0=new r$(j$.box,x9(X==="industrial"?"#334155":"#7c4a3b"),S.length),V$=new r$(j$.box,x9("#bde3ff"),S.length);y0.castShadow=!0;for(var v$=0;v$<S.length;v$++){var K$=S[v$];q0.position.set(K$.x,K$.y+K$.h*0.5,K$.z),q0.rotation.set(0,0,0),q0.scale.set(K$.w,K$.h,K$.d),q0.updateMatrix(),y0.setMatrixAt(v$,q0.matrix),y0.setColorAt(v$,new y$(K$.color)),q0.position.y=K$.y+K$.h+0.15,q0.scale.set(K$.w+0.35,0.3,K$.d+0.35),q0.updateMatrix(),u0.setMatrixAt(v$,q0.matrix),q0.position.set(K$.x,K$.y+K$.h*0.58,K$.z+K$.d*0.505),q0.scale.set(K$.w*0.6,Math.max(0.7,K$.h*0.36),0.08),q0.updateMatrix(),V$.setMatrixAt(v$,q0.matrix)}if(y0.instanceMatrix.needsUpdate=!0,y0.instanceColor)y0.instanceColor.needsUpdate=!0;u0.instanceMatrix.needsUpdate=!0,V$.instanceMatrix.needsUpdate=!0,G.add(y0),G.add(u0),G.add(V$)}function kY(W){if(!G)return;C7(),m9();var X=Math.round(f0(k(W.n,8),1,40)),K=k(W.x1,-30),H=k(W.z1,15),B=k(W.x2,30),O=k(W.z2,15),D=B-K,j=O-H,v=Math.sqrt(D*D+j*j),S=f0(v/Math.max(1,X)*0.72,2.6,6),h=N0(W.style,"coloridas"),p=b4[h]||b4.coloridas,c=Math.atan2(D,j)+Math.PI*0.5,$0=new r$(j$.box,Q$({color:"#ffffff"}),X),H0=new r$(j$.pyr,x9(h==="modernas"?"#334155":"#8b4a3b"),X),E0=new r$(j$.box,x9("#5b3a29"),X),M0=new r$(j$.box,x9("#bde3ff"),X*2);$0.castShadow=!0;for(var m0=0;m0<X;m0++){var Z$=X===1?0.5:m0/(X-1),y0=K+D*Z$,u0=H+j*Z$,V$=h0(y0,u0),v$=h==="modernas"?4.2:3.2;q0.position.set(y0,V$+v$*0.5,u0),q0.rotation.set(0,c,0),q0.scale.set(S,v$,4.2),q0.updateMatrix(),$0.setMatrixAt(m0,q0.matrix),$0.setColorAt(m0,new y$(p[m0%p.length])),q0.position.y=V$+v$+1,q0.scale.set(S+0.7,2,5),q0.updateMatrix(),H0.setMatrixAt(m0,q0.matrix);var K$=Math.sin(c),h$=Math.cos(c),E$=Math.cos(c),i$=-Math.sin(c);q0.position.set(y0+K$*2.12,V$+0.95,u0+h$*2.12),q0.scale.set(0.85,1.9,0.1),q0.updateMatrix(),E0.setMatrixAt(m0,q0.matrix);for(var c$=0;c$<2;c$++){var y9=c$===0?-S*0.27:S*0.27;q0.position.set(y0+K$*2.13+E$*y9,V$+1.85,u0+h$*2.13+i$*y9),q0.scale.set(0.72,0.82,0.08),q0.updateMatrix(),M0.setMatrixAt(m0*2+c$,q0.matrix)}F7(y0,u0,Math.max(S,4.2)*0.48)}if($0.instanceMatrix.needsUpdate=!0,$0.instanceColor)$0.instanceColor.needsUpdate=!0;H0.instanceMatrix.needsUpdate=!0,E0.instanceMatrix.needsUpdate=!0,M0.instanceMatrix.needsUpdate=!0,G.add($0),G.add(H0),G.add(E0),G.add(M0)}function $2(W){var X=N0(W,"automatica");if(X!=="automatica"&&X!=="alta"&&X!=="desempenho")X="automatica";if(K9.auto=X==="automatica",K9.decided=X!=="automatica",K9.probeT=0,K9.fpsAcc=0,K9.fpsN=0,X==="desempenho"){U1();return}K1("alta")}function zY(){var W="projeto";if(typeof document<"u"&&document.title)W=document.title;return"sz:w3d:inventario:"+W.slice(0,80)}function wY(){if(lW)return;lW=!0;var W=U6(zY());if(!W)return;var X=null;try{X=JSON.parse(W)}catch(D){X=null}if(!X||typeof X!=="object")return;var K=Object.keys(X);for(var H=0;H<K.length;H++){var B=K[H],O=k(X[B],0);if(O>0)GQ[B]=Math.floor(O)}}function _Y(W){var X=N0(W,"item").trim().slice(0,60);if(!X)X="item";return X}function J2(){yQ(zY(),JSON.stringify(GQ))}function h4(W){wY();var X=_Y(W);return Math.max(0,Math.floor(k(GQ[X],0)))}function yY(W,X){wY();var K=_Y(W),H=Math.max(0,h4(K)+Math.floor(k(X,0)));return GQ[K]=H,J2(),H}var fY={pouca:30,media:80,muita:150};function bY(W){if(W7){try{G.remove(W7.mesh),W7.mesh.geometry.dispose(),W7.mat.dispose()}catch(h){}W7=null}var X=fY[W]||0;if(!G||X<=0)return;var K=H7(4242),H=new Float32Array(X*3),B=J.world/2-4;for(var O=0;O<X;O++)H[O*3]=(K()*2-1)*B,H[O*3+2]=(K()*2-1)*B,H[O*3+1]=h0(H[O*3],H[O*3+2])+0.8+K()*1.6;var D=new p9;D.setAttribute("position",new z9(H.slice(),3));var j=new w7({color:"#fef08a",size:0.35,transparent:!0,opacity:0,depthWrite:!1,sizeAttenuation:!0}),v=_5();if(v)j.map=v;var S=new z7(D,j);S.frustumCulled=!1,G.add(S),W7={mesh:S,mat:j,home:H,n:X}}function Q2(){if(!W7)return;if(W7.mat.opacity=a9*0.9,a9<0.02)return;var W=W7.mesh.geometry.getAttribute("position"),X=r;for(var K=0;K<W7.n;K++){var H=W7.home[K*3],B=W7.home[K*3+1],O=W7.home[K*3+2];W.setXYZ(K,H+Math.sin(X*0.9+K*1.7)*1.2,B+Math.sin(X*1.3+K*0.9)*0.5,O+Math.cos(X*0.7+K*2.3)*1.2)}W.needsUpdate=!0}function hY(W,X){if(!G)return;if(WJ.length>=bW){C$("camp-max","muitas fogueiras (teto "+bW+")");return}var K=k(W,0),H=k(X,0),B=h0(K,H),O=new t$,D=Q$({color:"#7c4a2d"}),j=new T0(new Q9(0.12,0.12,1.4,6),D);j.rotation.z=Math.PI/2,j.rotation.y=0.6,j.position.y=0.14,O.add(j);var v=new T0(new Q9(0.12,0.12,1.4,6),D);v.rotation.z=Math.PI/2,v.rotation.y=-0.6,v.position.y=0.16,O.add(v),O.position.set(K,B,H),G.add(O);var S=18,h=new Float32Array(S*3),p=new Float32Array(S);for(var c=0;c<S;c++)p[c]=Math.random(),h[c*3]=K+(Math.random()-0.5)*0.5,h[c*3+1]=B+Math.random()*1.2,h[c*3+2]=H+(Math.random()-0.5)*0.5;var $0=new p9;$0.setAttribute("position",new z9(h,3));var H0=new w7({color:"#fb923c",size:0.5,transparent:!0,opacity:0.95,depthWrite:!1}),E0=_5();if(E0)H0.map=E0;var M0=new z7($0,H0);M0.frustumCulled=!1,G.add(M0),WJ.push({x:K,z:H,gy:B,pts:M0,seeds:p,n:S})}function Z2(W){for(var X=0;X<WJ.length;X++){var K=WJ[X],H=K.pts.geometry.getAttribute("position");for(var B=0;B<K.n;B++){var O=H.getY(B)+(0.8+K.seeds[B])*W;if(O>K.gy+1.3)O=K.gy+0.1;H.setXYZ(B,K.x+Math.sin(r*6+B*2.1)*0.14*K.seeds[B],O,K.z+Math.cos(r*5+B*1.3)*0.14*K.seeds[B])}if(H.needsUpdate=!0,n){var D=n.x-K.x,j=n.z-K.z;if(D*D+j*j<25)Q6={x:K.x,z:K.z}}}}var x4={tijolo:{g:"box",sx:0.55,sy:0.3,sz:0.28,color:"#b45309",r:0.4},banco:{g:"box",sx:1.3,sy:0.42,sz:0.45,color:"#8b5a2b",r:0.7},cerca:{g:"box",sx:1.5,sy:0.95,sz:0.09,color:"#9a7b4f",r:0.8},lanterna:{g:"cyl",sx:0.3,sy:0.55,sz:0.3,color:"#fbbf24",r:0.3},cone:{g:"cone",sx:0.5,sy:0.7,sz:0.5,color:"#f97316",r:0.35}};function X2(W){if(!R5)R5={};if(R5[W])return R5[W];var X=x4[W],K=CQ(),H=X.g==="cyl"?K.cyl:X.g==="cone"?K.cone:new X9(1,1,1),B=new r$(H,Q$({color:X.color}),80);return B.count=0,B.castShadow=!0,B.frustumCulled=!1,G.add(B),R5[W]={mesh:B,spec:X},R5[W]}function g4(W,X,K){if(!G||!x4[W])return;if(R8.length>=_W){C$("push-max","muitos objetos empurráveis (teto "+_W+") — os novos foram ignorados");return}var H=X2(W),B=H.mesh.count;if(B>=80){C$("push-type-max-"+W,'muitos "'+W+'" (teto 80 por tipo)');return}H.mesh.count=B+1;var O={type:W,im:H,idx:B,x:k(X,0),z:k(K,0),y:0,vx:0,vz:0,vy:0,spin:0,yaw:Math.random()*Math.PI*2,home:{x:k(X,0),z:k(K,0)},sink:0};O.y=h0(O.x,O.z)+H.spec.sy/2,R8.push(O),xY(O)}function xY(W){if(!q0)q0=new o8;var X=W.im.spec;q0.position.set(W.x,W.y,W.z),q0.rotation.set(0,W.yaw,0),q0.scale.set(X.sx,X.sy,X.sz),q0.updateMatrix(),W.im.mesh.setMatrixAt(W.idx,q0.matrix),W.im.mesh.instanceMatrix.needsUpdate=!0}function W2(W){if(!$6)$6={};if($6[W])return $6[W];var X=document.createElement("canvas");X.width=128,X.height=128;var K=X.getContext("2d");if(!K)return null;K.fillStyle="#f8fafc",K.fillRect(0,0,128,128),K.fillStyle="#0f172a",K.font="900 96px "+$,K.textAlign="center",K.textBaseline="middle",K.fillText(W,64,70);var H=new l8(X);return $6[W]=H,H}function gY(W,X,K,H){if(!G)return;var B=N0(W,"OI").toUpperCase(),O=f0(k(H,1),0.4,3),D=k(X,0),j=k(K,0);for(var v=0;v<B.length;v++){var S=B.charAt(v);if(S===" ")continue;if(iZ>=yW){C$("letters-max","muitas letras (teto "+yW+") — o resto da palavra ficou de fora");return}iZ++;var h=W2(S),p=h?new Y9({map:h}):new Y9({color:"#f8fafc"}),c=new T0(new X9(0.9,0.9,0.9),p);c.castShadow=!0;var $0=D+(v-(B.length-1)/2)*O,H0={type:"letra",mesh:c,x:$0,z:j,y:0,vx:0,vz:0,vy:0,spin:0,yaw:0,home:{x:$0,z:j},sink:0,scale:O*0.9};H0.y=h0($0,j)+O*0.45,c.scale.setScalar(O*0.9/0.9),c.position.set(H0.x,H0.y,H0.z),G.add(c),R8.push(H0)}}function uY(W,X,K,H){W.vx+=X*H,W.vz+=K*H,W.vy+=H*0.35,W.spin+=(Math.random()-0.5)*H*2}function Y2(W){if(!R8.length)return;var X=n;for(var K=0;K<R8.length;K++){var H=R8[K],B=H.im?H.im.spec:{sy:H.scale||0.9,r:(H.scale||0.9)*0.55};if(H.sink>0)if(H.sink-=W,H.sink<=0)H.x=H.home.x,H.z=H.home.z,H.vx=H.vz=H.vy=0,H.y=h0(H.x,H.z)+B.sy/2;else continue;if(X){var O=H.x-X.x,D=H.z-X.z,j=B.r+1.2,v=O*O+D*D;if(v<j*j&&Math.abs(X.speed)>0.8){var S=Math.sqrt(v)||0.01;if(uY(H,O/S,D/S,Math.min(10,Math.abs(X.speed)*0.55)),X.speed*=0.92,Math.abs(X.speed)>6)j9(160,0.05)}}var h=Math.abs(H.vx)+Math.abs(H.vz)+Math.abs(H.vy)>0.02;if(h){H.vy-=a0*0.8*U$*W,H.x+=H.vx*W,H.z+=H.vz*W,H.y+=H.vy*W;var p=h0(H.x,H.z)+B.sy/2;if(H.y<=p)H.y=p,H.vy=H.vy<-3?-H.vy*0.3:0,H.vx*=0.86,H.vz*=0.86;if(H.yaw+=H.spin*W,H.spin*=0.94,J0&&J0.y-H.y>0.6)H.sink=2,H.y=-9999;if(H.im)xY(H);if(H.mesh)H.mesh.position.set(H.x,H.y,H.z),H.mesh.rotation.y=H.yaw}}}function pY(W,X){if(!G)return;var K=Q$({color:"#dc2626"}),H=new T0(new X9(0.9,0.9,0.9),K),B=k(W,0),O=k(X,0);H.position.set(B,h0(B,O)+0.45,O),H.castShadow=!0,G.add(H);var D=new T0(new X9(0.94,0.16,0.94),Q$({color:"#7f1d1d"}));D.position.y=0.4,H.add(D),J6.push({mesh:H,x:B,z:O,fuse:-1,done:!1})}function lY(W){if(W.done)return;W.done=!0;try{G.remove(W.mesh)}catch(E$){C$("remove-explosive","não consegui remover a caixa explosiva: "+E$)}LJ(W.mesh,!0);var X=new Y9({color:"#fbbf24",transparent:!0,opacity:0.9}),K=new T0(new D5(1,12,10),X);K.position.set(W.x,h0(W.x,W.z)+1,W.z),G.add(K),ZJ.push({mesh:K,t:0}),wQ();for(var H=0;H<40;H++){var B=Math.random()*Math.PI*2,O=3+Math.random()*6;EJ(W.x,h0(W.x,W.z)+1,W.z,Math.cos(B)*O,2+Math.random()*5,Math.sin(B)*O,1.1,8,0,H%2?"#f97316":"#fde68a")}j9(52,0.4),j9(90,0.2);var D=8;for(var j=0;j<R8.length;j++){var v=R8[j],S=v.x-W.x,h=v.z-W.z,p=Math.sqrt(S*S+h*h);if(p<D)uY(v,S/(p||0.01),h/(p||0.01),(1-p/D)*14)}for(var c=0;c<T.length;c++){var $0=T[c],H0=$0.x-W.x,E0=$0.z-W.z,M0=Math.sqrt(H0*H0+E0*E0);if(M0<D)$0.vx+=H0/(M0||0.01)*(1-M0/D)*10,$0.vz+=E0/(M0||0.01)*(1-M0/D)*10,$0.vy+=(1-M0/D)*6}if(n){var m0=n.x-W.x,Z$=n.z-W.z,y0=Math.sqrt(m0*m0+Z$*Z$);if(y0<D)n.vy=Math.max(n.vy,(1-y0/D)*9),n.airborne=!0,n.pitchV+=2,v0=Math.max(v0,0.5),F$=Math.max(F$,0.4),e$=0.3}for(var u0=0;u0<J6.length;u0++){var V$=J6[u0];if(V$.done||V$.fuse>=0)continue;var v$=V$.x-W.x,K$=V$.z-W.z;if(Math.sqrt(v$*v$+K$*K$)<6)V$.fuse=0.15}for(var h$=0;h$<YQ.length;h$++)try{YQ[h$]()}catch(E$){C$("hook-boom-"+h$,'erro no "Quando algo explodir": '+E$)}}function V2(W){for(var X=0;X<J6.length;X++){var K=J6[X];if(K.done)continue;if(K.fuse>=0){if(K.fuse-=W,K.fuse<=0)lY(K);continue}if(n){var H=K.x-n.x,B=K.z-n.z;if(H*H+B*B<2.6&&Math.abs(n.speed)>3)lY(K)}}for(var O=ZJ.length-1;O>=0;O--){var D=ZJ[O];D.t+=W;var j=D.t/0.45;if(j>=1){try{G.remove(D.mesh),D.mesh.geometry.dispose(),D.mesh.material.dispose()}catch(v){}ZJ.splice(O,1)}else D.mesh.scale.setScalar(1+j*5),D.mesh.material.opacity=0.9*(1-j)}}function j9(W,X){var K=TQ();if(!K)return;try{var H=K.createOscillator(),B=K.createGain();H.type="square",H.frequency.value=W,B.gain.value=0.05,H.connect(B),B.connect(K.destination),H.start(),B.gain.setTargetAtTime(0.0001,K.currentTime+X,0.03),H.stop(K.currentTime+X+0.2)}catch(O){}}function K2(){var W=TQ();if(W&&!h9)try{i9=W.createGain(),i9.gain.value=0.0001,i9.connect(W.destination),h9=W.createOscillator(),h9.type="square",h9.frequency.value=392,X7=W.createOscillator(),X7.type="square",X7.frequency.value=494,h9.connect(i9),X7.connect(i9),h9.start(),X7.start(),i9.gain.setTargetAtTime(0.06,W.currentTime,0.02)}catch(K){}P8-=3.2;for(var X=0;X<E5.length;X++)try{E5[X]()}catch(K){C$("hook-horn-"+X,'erro no "Quando buzinar": '+K)}}function U2(){try{if(i9&&p0)i9.gain.setTargetAtTime(0.0001,p0.currentTime,0.03)}catch(W){}try{if(h9)h9.stop(p0?p0.currentTime+0.2:0)}catch(W){}try{if(X7)X7.stop(p0?p0.currentTime+0.2:0)}catch(W){}h9=null,X7=null,i9=null}function q2(W){if(R0)P8+=((0-r5)*60-P8*10)*W,r5+=P8*W,R0.scale.y=1+f0(r5,-0.35,0.2)*0.4;if(!J8||!n)return;if(R$&&!B9)return;var X=m$("h");if(X&&!h9&&!JJ)K2();if(!X&&h9)U2();JJ=X}function H2(){if(G8||!G)return;Q8=new p9;var W=new Float32Array(Z0*4*3),X=new Float32Array(Z0*4),K=[];for(var H=0;H<Z0;H++){var B=H*4;K.push(B,B+1,B+2,B,B+2,B+3)}Q8.setAttribute("position",new z9(W,3)),Q8.setAttribute("aAlpha",new z9(X,1)),Q8.setIndex(K),w=new Float32Array(Z0);for(var O=0;O<Z0;O++)w[O]=1e9;var D=["attribute float aAlpha;","varying float vA;","void main() {","  vA = aAlpha;","  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);","}"].join(" "),j=["varying float vA;","void main() {","  if (vA <= 0.01) discard;","  gl_FragColor = vec4(0.12, 0.14, 0.16, vA * 0.55);","}"].join(" "),v=new n8({vertexShader:D,fragmentShader:j,transparent:!0,depthWrite:!1});G8=new T0(Q8,v),G8.frustumCulled=!1,G8.renderOrder=1,G.add(G8)}function dY(W,X,K){var H=a;a=(a+1)%Z0,w[H]=0;var B=0.14,O=0.3,D=Math.sin(K),j=Math.cos(K),v=h0(W,X)+0.03,S=Q8.getAttribute("position"),h=H*4;S.setXYZ(h,W-j*B-D*O,v,X+D*B-j*O),S.setXYZ(h+1,W+j*B-D*O,v,X-D*B-j*O),S.setXYZ(h+2,W+j*B+D*O,v,X-D*B+j*O),S.setXYZ(h+3,W-j*B+D*O,v,X+D*B+j*O),S.needsUpdate=!0}function F2(W){if(!QJ||!n||!V0)return;if(H2(),!G8)return;var X=n,K=GJ(),H=k(V0.speed,K.speed),B=U8().grip,O=Math.abs(X.steerIn||0)>0.5&&Math.abs(X.speed)>H*0.45,D=!X.airborne&&(C0||O||B<0.6&&Math.abs(X.speed)>2);if(X0-=W,D&&X0<=0){X0=0.035;var j=K.w/2+0.04,v=K.l*0.34,S=Math.sin(X.yaw),h=Math.cos(X.yaw);dY(X.x+-j*h+-v*S,X.z- -j*S+-v*h,X.yaw),dY(X.x+j*h+-v*S,X.z-j*S+-v*h,X.yaw)}var p=Q8.getAttribute("aAlpha");for(var c=0;c<Z0;c++){w[c]+=W;var $0=1-w[c]/t;if($0<0)$0=0;var H0=c*4;p.setX(H0,$0),p.setX(H0+1,$0),p.setX(H0+2,$0),p.setX(H0+3,$0)}p.needsUpdate=!0}function B2(W){if(!t5||!q9||!n)return;var X=n;WQ+=W*8;var K=Math.sin(WQ)>0,H=(X.accelIn||0)<0&&X.speed>0.5,B=X.speed<-0.2,O=X.steerIn||0,D;for(D=0;D<q9.brake.length;D++)q9.brake[D].material.color.set(H?"#ff2d2d":"#5f1414");for(D=0;D<q9.rev.length;D++)q9.rev[D].material.color.set(B?"#ffffff":"#6b7280");for(D=0;D<q9.blinkL.length;D++)q9.blinkL[D].material.color.set(O>0.3&&K?"#ffb020":"#7c5a10");for(D=0;D<q9.blinkR.length;D++)q9.blinkR[D].material.color.set(O<-0.3&&K?"#ffb020":"#7c5a10");var j=a9>0.25;for(D=0;D<q9.head.length;D++)q9.head[D].material.color.set(j?"#fff7c2":"#8a8672")}function N2(){if(!G)return;if(!Y$&&a9>0.01)J$=new Y9({color:"#f5f3ce",transparent:!0,opacity:0,fog:!1,depthWrite:!1}),Y$=new T0(new kZ(7,24),J$),Y$.renderOrder=-1,G.add(Y$);if(!Y$)return;J$.opacity=a9*0.9;var W=n?n.x:0,X=n?n.z:0;if(Y$.position.set(W-90,85,X-130),f)Y$.lookAt(f.position)}function O2(){if(!M)return;var W=!1;if(C0&&n&&V0){var X=k(V0.speed,GJ().speed);W=Math.abs(n.speed)>X*0.75}if(W&&!g$)g$=document.createElement("div"),g$.setAttribute("style","position:absolute;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center, rgba(255,255,255,0) 55%, rgba(255,255,255,0.16) 100%);"),M.appendChild(g$);if(g$)g$.style.display=W?"block":"none"}function L2(){if(!D$||!n)return;D$.rotation.x=f0(-n.pitch*1.6,-0.7,0.7),D$.rotation.z=f0(-n.roll*1.6,-0.7,0.7)}function I2(W){if(q2(W),B2(W),F2(W),N2(),O2(),L2(),I0==="arco-iris"&&k0&&k0.color&&k0.color.setHSL)k0.color.setHSL(r*0.12%1,0.75,0.55)}function D2(){if(!W0)return;try{if(G)G.remove(W0);W0.traverse(function(W){if(W.geometry&&W.geometry.dispose)try{W.geometry.dispose()}catch(X){}if(W.material&&W.material.dispose)try{W.material.dispose()}catch(X){}})}catch(W){}W0=null,R0=null,j0=[]}function MJ(){if(!G||!V0)return;D2();var W=GJ(),X=N0(V0.color,"#ef4444");W0=new t$,R0=new t$,W0.add(R0);var K=X,H=null;if(I0==="chamas")K="#ea580c",H="#facc15";else if(I0==="listras")H="#ffffff";else if(I0==="estrelas")K="#1e2a5a",H="#ffffff";k0=Q$({color:K});var B=k0,O=Q$({color:"#1f2937"}),D=Q$({color:"#bfdbfe"});if(c0){var j=new T0(new Q9(W.w*0.34,W.w*0.42,W.l*0.72,12),B);j.rotation.x=Math.PI/2,j.position.y=W.clear+W.h*0.9,j.castShadow=!0,R0.add(j);var v=new T0(new d8(W.w*0.34,W.l*0.3,12),Q$({color:"#ef4444"}));v.rotation.x=Math.PI/2,v.position.set(0,W.clear+W.h*0.9,W.l*0.51),v.castShadow=!0,R0.add(v);for(var S=0;S<3;S++){var h=new T0(new X9(0.06,W.h*0.9,W.l*0.22),Q$({color:"#ef4444"})),p=S/3*Math.PI*2;h.position.set(Math.cos(p)*W.w*0.4,W.clear+W.h*0.9+Math.sin(p)*W.w*0.4,-W.l*0.3),h.rotation.z=p,R0.add(h)}}else{var c=new T0(new X9(W.w,W.h,W.l),B);c.position.y=W.clear+W.h/2,c.castShadow=!0,R0.add(c);var $0=new T0(new X9(W.w*0.78,W.cab,W.l*0.42),D);if($0.position.set(0,W.clear+W.h+W.cab/2,-W.l*0.06),$0.castShadow=!0,R0.add($0),H){var H0=new T0(new X9(W.w*0.28,0.03,W.l*0.98),Q$({color:H}));H0.position.y=W.clear+W.h+0.02,R0.add(H0)}}var E0=new Q9(W.wheel,W.wheel,0.3,14);E0.rotateZ(Math.PI/2);var M0=W.w/2+0.04,m0=W.l*0.34,Z$=[{x:-M0,z:m0,front:!0},{x:M0,z:m0,front:!0},{x:-M0,z:-m0,front:!1},{x:M0,z:-m0,front:!1}];j0=[];for(var y0=0;y0<Z$.length;y0++){var u0=Z$[y0],V$=new t$;V$.position.set(u0.x,W.wheel,u0.z);var v$=new T0(E0,O);v$.castShadow=!0,V$.add(v$),W0.add(V$),j0.push({mesh:v$,pivot:V$,front:u0.front})}D$=new t$;var K$=new T0(new Q9(0.015,0.02,0.7,6),O);K$.position.y=0.35,D$.add(K$);var h$=new T0(new D5(0.05,8,8),Q$({color:"#ef4444"}));if(h$.position.y=0.72,D$.add(h$),D$.position.set(-W.w*0.32,W.clear+W.h,-W.l*0.42),R0.add(D$),q9=null,t5&&!c0){q9={head:[],brake:[],rev:[],blinkL:[],blinkR:[]};var E$=function(n7,M7,Y5,y5,gQ,uQ,p4){var vJ=new T0(new X9(n7,M7,0.05),new Y9({color:uQ}));vJ.position.set(Y5,y5,gQ),R0.add(vJ),p4.push(vJ)},i$=W.clear+W.h*0.62,c$=W.l/2+0.026,y9=W.w*0.32;E$(0.22,0.12,-y9,i$,c$,"#8a8672",q9.head),E$(0.22,0.12,y9,i$,c$,"#8a8672",q9.head),E$(0.2,0.1,-y9,i$,-c$,"#5f1414",q9.brake),E$(0.2,0.1,y9,i$,-c$,"#5f1414",q9.brake),E$(0.1,0.08,0,i$-0.02,-c$,"#6b7280",q9.rev);var g9=W.clear+W.h*0.4;E$(0.09,0.09,-(W.w/2+0.026),g9,W.l*0.38,"#7c5a10",q9.blinkL),E$(0.09,0.09,-(W.w/2+0.026),g9,-W.l*0.38,"#7c5a10",q9.blinkL),E$(0.09,0.09,W.w/2+0.026,g9,W.l*0.38,"#7c5a10",q9.blinkR),E$(0.09,0.09,W.w/2+0.026,g9,-W.l*0.38,"#7c5a10",q9.blinkR)}if(!n)n={x:0,y:0,z:0,yaw:0,speed:0,vy:0,airborne:!1,steerVis:0,pitch:0,pitchV:0,roll:0,rollV:0,spin:0},n.y=h0(0,0);l0=!0,G.add(W0)}function P2(W){if(!n||!V0)return;var X=n,K=GJ(),H=k(V0.speed,K.speed),B=k(V0.turn,K.turn),O=k(V0.jump,K.jump),D=U8().grip,j=(m$("w")||m$("arrowup")?1:0)-(m$("s")||m$("arrowdown")?1:0),v=(m$("a")||m$("arrowleft")?1:0)-(m$("d")||m$("arrowright")?1:0),S=R$&&!B9||B9&&a8==="boat";if(S)j=0,v=0;X.accelIn=j,X.steerIn=v,C0=U0!=null&&!S&&(m$("shift")||m$("shiftleft")||m$("shiftright"));var h=C0?1+k(U0.force,1):1,p=16*(0.5+0.5*D)*h;if(j>0)X.speed+=p*W;else if(j<0)X.speed-=p*0.95*W;else X.speed-=X.speed*Math.min(1,(0.9+0.7*D)*W);X.speed=f0(X.speed,-H*0.45,H*h);var c=Math.min(1,Math.abs(X.speed)/(H*0.22)),$0=Math.max(0.35,1-Math.abs(X.speed)/(H*1.7)),H0=B*Math.PI/180*c*$0*(0.55+0.45*D),E0=X.speed>=0?1:-1;if(X.yaw+=v*H0*E0*W,X.x+=Math.sin(X.yaw)*X.speed*W,X.z+=Math.cos(X.yaw)*X.speed*W,s9>0)s9-=W;var M0=nW(X.x,X.z,3.5);for(var m0=0;m0<M0.length;m0++){var Z$=M0[m0],y0=X.x-Z$.x,u0=X.z-Z$.z,V$=Z$.r+1.1,v$=y0*y0+u0*u0;if(v$>=V$*V$)continue;var K$=Math.sqrt(v$)||0.001;X.x+=y0/K$*(V$-K$),X.z+=u0/K$*(V$-K$);var h$=Math.abs(X.speed);if(X.speed*=0.3,h$>Math.max(4,H*0.35))X.pitchV-=1.4,Zq()}var E$=J.world/2-2;if(X.x>E$)X.x=E$,X.speed*=0.35;if(X.x<-E$)X.x=-E$,X.speed*=0.35;if(X.z>E$)X.z=E$,X.speed*=0.35;if(X.z<-E$)X.z=-E$,X.speed*=0.35;var i$=d9(X.x,X.z,X.y),c$=!1;if(X.airborne){if(X.vy-=a0*U$*W,X.y+=X.vy*W,X.y<=i$)X.y=i$,X.airborne=!1,c$=!0,X.pitchV+=Math.min(2.5,Math.abs(X.vy)*0.12),X.vy=0}else{var y9=i$-X.y;if(y9<-0.5&&Math.abs(X.speed)>H*0.55)X.airborne=!0,X.vy=0;else X.y=i$;if(R9(" ")&&!S)X.vy=O,X.airborne=!0}if(J0&&!X.airborne){var g9=J0.y-X.y;if(g9>1.2){if(Q6)X.x=Q6.x+2,X.z=Q6.z+2,X.yaw=l.yaw;else X.x=l.x,X.z=l.z,X.yaw=l.yaw;X.y=h0(X.x,X.z),X.speed=0,X.vy=0,l0=!0}else if(g9>0){var n7=Math.min(0.7,g9*0.35);X.speed*=Math.max(0,1-n7*W*4)}else l.x=X.x,l.z=X.z,l.yaw=X.yaw}else if(!X.airborne)l.x=X.x,l.z=X.z,l.yaw=X.yaw;var M7=X.airborne?null:cU(X.x,X.z),Y5=Math.sin(X.yaw),y5=Math.cos(X.yaw),gQ=0,uQ=0;if(M7)gQ=(M7.x*Y5+M7.z*y5)*1.4,uQ=(M7.x*y5-M7.z*Y5)*1.4;var p4=gQ-j*Math.min(1,Math.abs(X.speed)/H+0.3)*0.06,vJ=uQ+v*E0*Math.min(1,Math.abs(X.speed)/H)*0.1,cY=42,oY=9;if(X.pitchV+=((p4-X.pitch)*cY-X.pitchV*oY)*W,X.pitch+=X.pitchV*W,X.rollV+=((vJ-X.roll)*cY-X.rollV*oY)*W,X.roll+=X.rollV*W,W0){if(W0.position.set(X.x,X.y,X.z),W0.rotation.y=X.yaw,R0)R0.rotation.x=f0(X.pitch,-0.5,0.5),R0.rotation.z=f0(X.roll,-0.5,0.5);X.steerVis+=(v-X.steerVis)*Math.min(1,10*W);var C2=GJ();X.spin+=X.speed/Math.max(0.05,C2.wheel)*W;for(var l4=0;l4<j0.length;l4++){var d4=j0[l4];if(d4.mesh.rotation.x=X.spin,d4.front)d4.pivot.rotation.y=X.steerVis*0.42}}if(c$&&R0)R0.position.y=-0.03;else if(R0&&R0.position.y!==0)R0.position.y+=(0-R0.position.y)*Math.min(1,8*W)}function G2(W){if(!f)return;var X=RJ();if(X&&r0!=="cinema-sem-carro"){var K=X,H=R$&&!B9,B,O,D;if(r0==="topo")B=K.x,D=K.z+0.01,O=K.y+22+Math.abs(K.speed)*0.2;else if(r0==="cinema"){_0+=W*0.25;var j=12+Math.abs(K.speed)*0.15;B=K.x+Math.cos(_0)*j,D=K.z+Math.sin(_0)*j,O=K.y+5}else{var v=(H?5:7.5)+Math.abs(K.speed)*0.12,S=(H?2.3:3.1)+Math.abs(K.speed)*0.03;B=K.x-Math.sin(K.yaw)*v,D=K.z-Math.cos(K.yaw)*v,O=K.y+S}var h=h0(B,D)+1.2;if(O<h)O=h;if(l0)f.position.set(B,O,D),L0.set(K.x,K.y+1.1,K.z),l0=!1;else{var p=O4(r0==="topo"?6:4.5,W);f.position.x+=(B-f.position.x)*p,f.position.y+=(O-f.position.y)*p,f.position.z+=(D-f.position.z)*p;var c=O4(8,W);L0.x+=(K.x-L0.x)*c,L0.y+=(K.y+1.1-L0.y)*c,L0.z+=(K.z-L0.z)*c}if(v0>0){v0-=W;var $0=F$*Math.max(0,v0);f.position.x+=(Math.random()*2-1)*$0,f.position.y+=(Math.random()*2-1)*$0,f.position.z+=(Math.random()*2-1)*$0}f.lookAt(L0)}else{_0+=W*0.12;var H0=J.world*0.32;f.position.set(Math.cos(_0)*H0,J.world*0.16,Math.sin(_0)*H0),L0.set(0,0,0),f.lookAt(L0)}}function E2(){var W=RJ();if(!d||!W)return;if(d.position.set(W.x+J.world*0.22,J.world*0.35,W.z+J.world*0.16),g){if(g.position.set(W.x,0,W.z),g.updateMatrixWorld)g.updateMatrixWorld()}}function R2(W){var X=typeof W==="number"?W:0,K=e?(X-e)/1000:0;if(e=X,!(K>=0))K=0;if(K>0.03333333333333333)K=0.03333333333333333;if(Q0=K,r+=K,K9.auto&&!K9.decided){if(K9.probeT+=K,K9.probeT>1.5)K9.fpsAcc+=K,K9.fpsN++;if(K9.probeT>4){K9.decided=!0;var H=K9.fpsN/Math.max(0.001,K9.fpsAcc);if(H<45)U1()}}if(e$<1){var B=K;K*=e$,Q0=K,e$=Math.min(1,e$+B/1.2)}if(P2(K),wH(K),I2(K),Gq(K),Eq(K),WH(K),eq(K),JH(K),QH(K),Y2(K),V2(K),fH(),bH(),cH(),tH(Q0),iH(Q0),aH(Q0),Q2(),Z2(K),AH(K),TH(K),SH(K),vH(K),IH(K),GH(),RH(),HH(),UH(K),NH(),R9("p")&&W4&&!W9)g1();Cq();for(var O=0;O<P.length;O++)try{P[O](K)}catch(S){C$("hook-update-"+O,'erro no "A cada quadro": '+S)}if(G2(K),E2(),zq(),xq(K),gq(K),Aq(),F0)F0.uniforms.uTime.value=r;if(k$){k$.uniforms.uTime.value=r,k$.uniforms.uWind.value=z5;var D=RJ(),j=D?D.x:f?f.position.x:0,v=D?D.z:f?f.position.z:0;if(k$.uniforms.uCenter.value.set(j,v),k$.uniforms.uNight)k$.uniforms.uNight.value=a9}if(L={},y&&G&&f)Bq()}function mY(){if(V){z0("o passeio já começou automaticamente — o bloco antigo de início não é mais necessário");return}if(!K6()){try{document.addEventListener("DOMContentLoaded",function(){mY()})}catch(W){}return}if(!sq())return;V=!0,cq(),S1(),window.addEventListener("resize",function(){S1()}),Promise.all(I.slice()).then(function(){if(F||!y)return;e=0,y.setAnimationLoop(R2)})}function u4(){if(F)return;F=!0;try{if(y){y.setAnimationLoop(null);try{y.dispose()}catch(B){}try{y.forceContextLoss()}catch(B){}}if(G&&G.traverse)G.traverse(function(B){if(B.isInstancedMesh&&B.dispose)try{B.dispose()}catch(j){}if(B.geometry&&B.geometry.dispose)try{B.geometry.dispose()}catch(j){}if(B.material){var O=B.material;if(O.length){for(var D=0;D<O.length;D++)if(O[D]&&O[D].dispose)try{O[D].dispose()}catch(j){}}else if(O.dispose)try{O.dispose()}catch(j){}}});if(j$){for(var W in j$)if(j$[W]&&j$[W].dispose)try{j$[W].dispose()}catch(B){}}if(x&&x.dispose)try{x.dispose()}catch(B){}if(z&&z.dispose)try{z.dispose()}catch(B){}if(R7&&R7.dispose)try{R7.dispose()}catch(B){}if(T8&&T8.dispose)try{T8.dispose()}catch(B){}if(F0&&F0.dispose)try{F0.dispose()}catch(B){}if(rW(),tW(),K8){for(var X in K8)W6(K8[X],"dispose-hdr-cache");K8=null}if(F4++,u7)for(var K in u7){var H=u7[K];if(H&&H.scene)LJ(H.scene,!0)}try{if(z$)z$.stop()}catch(B){}try{if(h9)h9.stop()}catch(B){}try{if(X7)X7.stop()}catch(B){}try{if(D0)D0.pause()}catch(B){}try{if(p0&&p0.close)p0.close()}catch(B){}if(V1(),Fq(),C&&C.parentNode)try{C.parentNode.removeChild(C)}catch(B){}if(R&&R.parentNode)try{R.parentNode.removeChild(R)}catch(B){}}catch(B){}if(y=null,G=null,f=null,o=null,_=null,W0=null,R0=null,j0=[],x=null,z=null,A0=null,j$=null,E7=null,NQ=Object.create(null),u7=null,p7=null,l7=null,c7=null,k$=null,R7=null,S5=null,k5=null,T8=null,Y7=null,K0=null,F0=null,z$=null,M$=null,B0=null,p0=null,D0=null,t0=null,f$=[],L$=[],W$=[],F9=null,V6=null,G0=null,T=[],i=null,h9=null,X7=null,i9=null,q9=null,G8=null,Q8=null,w=null,Y$=null,J$=null,D$=null,g$=null,S$=[],d$=null,$$=null,p$=null,v9=[],U7=null,V9=null,r9=null,E8=null,e5=[],O9=null,R8=[],R5=null,iZ=0,$6=null,J6=[],YQ=[],ZJ=[],VQ=[],j5=[],b7=null,l9=null,s$=null,T9=null,XJ=[],C5=null,f7=[],Z8=null,L9=null,H9=null,rZ=[],h7=null,UQ=!1,qJ=[],HJ=[],tZ=0,eZ=0,$4=0,J4=0,W7=null,WJ=[],Q6=null,s8)try{s8.dispose()}catch(B){}s8=null,D9=null,X8=null,B$=null,i8=null,j8=null,$Y(),q7=null,P9=null,r8=null,KQ=[],M5=[],YJ=null,t8="desligado",D7=[],UJ=Object.create(null),P7=Object.create(null),P$=null,W8=null,Y8=null,qQ=0,HQ=[],$5=null,C8=[],FJ=Object.create(null),x7=null,FQ=[],J5=null,G7=null,BJ=Object.create(null),V8=null,M8=null,v8=null,W9=null,g7=null,BQ=[],Z6=null}if(typeof window<"u"&&window.addEventListener)window.addEventListener("pagehide",u4),window.addEventListener("beforeunload",u4);function Y0(W,X){return function(){try{return X.apply(null,arguments)}catch(K){z0('erro em "'+W+'": '+K);return}}}function j2(W){if(typeof W!=="function"){z0("o projeto precisa de uma função de início");return}try{W()}catch(X){z0('erro em "Ao iniciar": '+X)}}var xQ={setup:Y0("setup",function(W){var X=W&&typeof W==="object"?W:{};if(V){z0('"Criar o mundo 3D" depois de começar não muda o mundo — deixe-o no comecinho');return}var K=N0(X.style,J.style);if(!Z[K])z0('não conheço o estilo "'+K+'" — usando floresta (tem: floresta, praia, neve, deserto, primavera, lua, fazenda)'),K="floresta";J.style=K,J.world=f0(k(X.world,J.world),40,600),U$=Z[K].gravity||1;var H=[];for(var B=0;B<t9.length;B++)if(!t9[B].autoLua)H.push(t9[B]);if(t9=H,K==="lua"){var O=H7(4040);for(var D=0;D<12;D++){var j=O()*Math.PI*2,v=Math.max(10,J.world*0.5-30),S=24+O()*v,h=5+O()*9;t9.push({kind:"crater",x:Math.cos(j)*S,z:Math.sin(j)*S,r:h,depth:1+h*0.16,rim:0.4+h*0.06,autoLua:!0})}}}),terrain:Y0("terrain",function(W,X){if(Q.hills=f0(k(W,Q.hills),0,30),Q.smooth=f0(k(X,Q.smooth),1,30),U){if(F8(),k$)q8();if(F0)H8()}}),start:Y0("start",mY),worldSize:Y0("worldSize",function(){return J.world}),groundHeight:Y0("groundHeight",function(W,X){return h0(k(W,0),k(X,0))}),flatten:Y0("flatten",function(W,X,K){var H=k(W,0),B=k(X,0);if(t9.push({kind:"flatten",x:H,z:B,r:f0(k(K,15),1,200),y:k8(H,B)}),U){if(F8(),k$)q8();if(F0)H8()}}),path:Y0("path",function(W,X,K,H,B){var O=k(W,0),D=k(X,0),j=k(K,0),v=k(H,0);if(t9.push({kind:"path",x1:O,z1:D,x2:j,z2:v,w:f0(k(B,5),1,40),y1:k8(O,D),y2:k8(j,v)}),U){if(F8(),k$)q8();if(F0)H8()}}),water:Y0("water",function(W,X){if(J0={y:k(W,0),color:N0(X,"#2b6cb0")},U)G4()}),skyPhoto:Y0("skyPhoto",tU),car:Y0("car",function(W){var X=W&&typeof W==="object"?W:{},K=N0(X.style,"passeio");if(!Y[K])z0('não conheço o carrinho "'+K+'" — usando passeio (tem: passeio, jipe, corrida)'),K="passeio";var H=Y[K];if(V0={style:K,color:N0(X.color,"#ef4444"),speed:H.speed,turn:H.turn,jump:H.jump},U)MJ()}),carStats:Y0("carStats",function(W,X,K){if(!V0){z0('ajuste DEPOIS de "Criar o carrinho dirigível"');return}V0.speed=f0(k(W,V0.speed),1,80),V0.turn=f0(k(X,V0.turn),10,360),V0.jump=f0(k(K,V0.jump),0,30)}),carPlace:Y0("carPlace",function(W,X,K){if(!n){z0('leve o carrinho DEPOIS de "Criar o carrinho dirigível"');return}var H=J.world/2-2;n.x=f0(k(W,0),-H,H),n.z=f0(k(X,0),-H,H),n.yaw=k(K,0)*Math.PI/180,n.y=h0(n.x,n.z),n.speed=0,n.vy=0,n.airborne=!1,l0=!0}),carPos:Y0("carPos",function(W){if(!n)return 0;var X=N0(W,"x");if(X==="y")return n.y;if(X==="z")return n.z;return n.x}),carSpeed:Y0("carSpeed",function(){return n?Math.abs(n.speed):0}),carBoost:Y0("carBoost",function(W){U0={force:f0(k(W,1),0,4)}}),horn:Y0("horn",function(){J8=!0}),onHorn:Y0("onHorn",function(W){if(typeof W!=="function"){z0('"Quando buzinar" precisa de blocos de fazer dentro');return}E5.push(W)}),carLights:Y0("carLights",function(){if(t5=!0,W0)MJ()}),tireMarks:Y0("tireMarks",function(W){if(QJ=!(W===!1||W==="desligadas"||W==="desligado"),!QJ&&w)for(var X=0;X<Z0;X++)w[X]=1e9}),carPaint:Y0("carPaint",function(W){var X=N0(W,"lisa");if(X!=="lisa"&&X!=="listras"&&X!=="chamas"&&X!=="arco-iris"&&X!=="estrelas"){z0('não conheço a pintura "'+X+'" — tem: lisa, listras, chamas, arco-iris, estrelas');return}if(I0=X,W0)MJ()}),engineSound:Y0("engineSound",function(W){var X=W===!0||W==="ligado"||W==="ligados"||W==="true";if(x0=X,X)q1();else if(M$&&p0)try{M$.gain.setTargetAtTime(0,p0.currentTime,0.1)}catch(K){}}),scatter:Y0("scatter",function(W,X){var K=N0(X,"");if(!jQ[K]){z0('não conheço "'+K+'" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos, palmeiras');return}var H={kind:"species",thing:K,n:k(W,100),seed:m.length,built:!1};if(m.push(H),U)w5(H)}),scatterModel:Y0("scatterModel",function(W,X,K){var H={kind:"model",name:N0(X,""),n:k(W,20),s:k(K,1),seed:m.length,model:null,built:!1};m.push(H);var B=J1(H.name,function(O){if(H.model=O,U)w5(H)});if(B){if(H.model=B,U)w5(H)}}),placeThing:Y0("placeThing",function(W,X,K,H){var B=N0(W,"");if(!jQ[B]){z0('não conheço "'+B+'" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos, palmeiras');return}var O={kind:"placeSpecies",thing:B,x:k(X,0),z:k(K,0),s:k(H,1),seed:m.length,built:!1};if(m.push(O),U)w5(O)}),placeModel:Y0("placeModel",function(W,X,K,H,B){var O={kind:"placeModel",name:N0(W,""),x:k(X,0),z:k(K,0),s:k(H,1),deg:k(B,0),seed:m.length,model:null,built:!1};m.push(O);var D=J1(O.name,function(j){if(O.model=j,U)w5(O)});if(D){if(O.model=D,U)w5(O)}}),clearArea:Y0("clearArea",function(W,X,K){S0.push({x:k(W,0),z:k(X,0),r:f0(k(K,10),1,200)})}),dayNight:Y0("dayNight",function(W){if(DQ.on=!0,DQ.minutes=f0(k(W,4),0.5,60),A5=!0,U)OJ=-1,vQ()}),setTime:Y0("setTime",function(W){var X={manha:9,meiodia:12,entardecer:17.5,noite:0},K=X[N0(W,"")];if(K==null){z0('não conheço a hora "'+N0(W,"")+'" — tem: manha, meiodia, entardecer, noite');return}if(d7=K,A5=!0,U)OJ=-1,vQ()}),weather:Y0("weather",function(W){var X=N0(W,"limpo");if(X!=="limpo"&&!W1[X]){z0('não conheço o clima "'+X+'" — tem: limpo, chuva, neve, folhas, tempestade');return}if(A8=X,U)AQ()}),confetti:Y0("confetti",function(){M4()}),fireworks:Y0("fireworks",function(){rq()}),tornado:Y0("tornado",function(W){$H(W)}),season:Y0("season",function(W){var X=N0(W,"verao");if(!k1[X]){z0('não conheço a estação "'+X+'" — tem: primavera, verao, outono, inverno');return}if(Z9=X,U)z1()}),achievement:Y0("achievement",function(W){YH(W)}),onAchievement:Y0("onAchievement",function(W,X){if(typeof X!=="function"){z0('"Quando ganhar a conquista" precisa de blocos de fazer dentro');return}var K=N0(W,"conquista");if(!BJ[K])BJ[K]=[];BJ[K].push(X)}),hasAchievement:Y0("hasAchievement",function(W){return!!U6("szw3d:ach:"+N0(W,""))}),minimap:Y0("minimap",function(W){var X=N0(W,"ver");if(X!=="ver"&&X!=="teleporte"){z0('não conheço "'+X+'" — tem: ver, teleporte');return}NJ=X}),racePodium:Y0("racePodium",function(){W4=!0}),whisperCorner:Y0("whisperCorner",function(W,X){if(!U){s0.push({kind:"whisperCorner",x:k(W,0),z:k(X,0)});return}p1(W,X)}),flameNote:Y0("flameNote",function(W,X,K){if(!U){s0.push({kind:"flameNote",x:k(W,0),z:k(X,0),text:N0(K,"...")});return}bQ(W,X,K,!1)}),coinsScatter:Y0("coinsScatter",function(W){if(!U){s0.push({kind:"coinsScatter",n:k(W,20)});return}l1(W)}),coinsRing:Y0("coinsRing",function(W,X,K,H){if(!U){s0.push({kind:"coinsRing",n:k(W,8),x:k(X,0),z:k(K,0),r:k(H,6)});return}d1(W,X,K,H)}),coinsLine:Y0("coinsLine",function(W,X,K,H,B){if(!U){s0.push({kind:"coinsLine",n:k(W,10),x1:k(X,0),z1:k(K,0),x2:k(H,0),z2:k(B,30)});return}m1(W,X,K,H,B)}),onCollect:Y0("onCollect",function(W){if(typeof W!=="function"){z0('"Quando pegar uma moeda" precisa de blocos de fazer dentro');return}HQ.push(W)}),coinCount:Y0("coinCount",function(){return qQ}),quest:Y0("quest",function(W,X){var K=N0(W,"missao");if(c1(K))return;if(C8.push({name:K,desc:N0(X,K),done:!1}),U)A4();else s0.push({kind:"questHud"})}),questDone:Y0("questDone",function(W){PH(W)}),onQuestDone:Y0("onQuestDone",function(W,X){if(typeof X!=="function"){z0('"Quando completar a missão" precisa de blocos de fazer dentro');return}var K=N0(W,"missao");if(!FJ[K])FJ[K]=[];FJ[K].push(X)}),marker:Y0("marker",function(W,X,K){var H=N0(W,"estrela");if(H==="nenhum")return;if(!o1[H]){z0('não conheço o ícone "'+H+'" — tem: alerta, estrela, alvo, moeda, nenhum');return}if(!U){s0.push({kind:"marker",icon:H,x:k(X,0),z:k(K,0)});return}n1(H,X,K)}),guideArrow:Y0("guideArrow",function(W,X,K){var H=!(K===!1||K==="desligada"||K==="desligado");J5=H?{x:k(W,0),z:k(X,0)}:null}),npc:Y0("npc",function(W,X,K,H,B){var O=N0(B,"nenhum");if(O!=="nenhum"&&!hQ[O])O="nenhum";if(!U){s0.push({kind:"npc",name:N0(W,"amigo"),x:k(X,0),z:k(K,0),color:N0(H,"#f97316"),hat:O});return}s1(W,X,K,H,O)}),npcWander:Y0("npcWander",function(W,X){var K=N0(W,"amigo"),H=jJ(K);if(H){H.home.r=f0(k(X,10),0,60);return}s0.push({kind:"npcWander",name:K,r:k(X,10)})}),npcTalk:Y0("npcTalk",function(W,X){if(typeof X!=="function"){z0('"Quando conversar com o amigo" precisa de blocos de fazer dentro');return}var K=N0(W,"amigo");if(!UJ[K])UJ[K]=[];UJ[K].push(X)}),npcSay:Y0("npcSay",function(W,X){var K=N0(W,"amigo");if(!P7[K])P7[K]=[];if(P7[K].push({kind:"say",text:N0(X,"...")}),U&&!H9&&(!P$||P$.el.style.display!=="block")){if(P7[K].length===1)CJ(K)}}),npcAsk:Y0("npcAsk",function(W,X,K,H,B,O){var D=N0(W,"amigo");if(!P7[D])P7[D]=[];if(P7[D].push({kind:"ask",q:N0(X,"..."),a:N0(K,"Sim"),fa:typeof H==="function"?H:null,b:N0(B,"Não"),fb:typeof O==="function"?O:null}),U&&!H9&&(!P$||P$.el.style.display!=="block")){if(P7[D].length===1)CJ(D)}}),npcEmote:Y0("npcEmote",function(W,X){var K=N0(X,"acenar");if(K!=="acenar"&&K!=="pular"&&K!=="girar"&&K!=="dancar"){z0('não conheço "'+K+'" — tem: acenar, pular, girar, dancar');return}var H=jJ(N0(W,"amigo"));if(H)H.emote={kind:K,t:K==="dancar"?2:1.2}}),islands:Y0("islands",function(W,X){var K=f0(k(W,4),2,8),H=k(X,0),B=[{x:0,z:0,r:Math.max(18,J.world*0.16),h:5.5}],O=H7(K*31+7);for(var D=1;D<K;D++){var j=D/K*Math.PI*2+O()*0.8,v=J.world*(0.24+O()*0.14);B.push({x:Math.cos(j)*v,z:Math.sin(j)*v,r:12+O()*12,h:3.5+O()*3})}if(YJ={list:B},!J0)J0={y:H,color:"#2b6cb0"};else J0.y=H;if(U){if(F8(),G4(),k$)q8();if(F0)H8()}}),boat:Y0("boat",function(W){if(VJ={color:N0(W,"#f8fafc")},U)a1()}),bridge:Y0("bridge",function(W,X,K,H,B){if(!U){s0.push({kind:"bridge",x1:k(W,0),z1:k(X,0),x2:k(K,20),z2:k(H,20),w:k(B,4)});return}r1(W,X,K,H,B)}),lighthouse:Y0("lighthouse",function(W,X){if(!U){s0.push({kind:"lighthouse",x:k(W,0),z:k(X,0)});return}t1(W,X)}),ambience:Y0("ambience",function(W){var X=N0(W,"desligado");if(X!=="desligado"&&X!=="mar"&&X!=="passaros"&&X!=="grilos"){z0('não conheço "'+X+'" — tem: mar, passaros, grilos, desligado');return}if(t8===X)return;if(X!=="mar")$Y();t8=X,KJ=0}),person:Y0("person",function(W,X){var K=N0(X,"nenhum");if(K!=="nenhum"&&!hQ[K])z0('não conheço o chapéu "'+K+'" — tem: nenhum, bone, palha, coroa, capacete'),K="nenhum";if(R$=R$||{},R$.color=N0(W,"#3b82f6"),R$.hat=K,R$.walk==null)R$.walk=4;if(R$.run==null)R$.run=8;if(R$.jump==null)R$.jump=7;if(R$.acc==null)R$.acc="nenhum";if(B9=!1,U)S4()}),personStats:Y0("personStats",function(W,X,K){if(!R$){z0('ajuste DEPOIS de "Criar o personagem a pé"');return}R$.walk=f0(k(W,4),1,20),R$.run=f0(k(X,8),1,40),R$.jump=f0(k(K,7),0,20)}),personPlace:Y0("personPlace",function(W,X,K){if(!R$){z0('leve o personagem DEPOIS de "Criar o personagem a pé"');return}if(!B$)B$={x:0,y:0,z:0,yaw:0,vy:0,airborne:!1,vis:0,phase:0,speed:0};if(B$.x=k(W,0),B$.z=k(X,0),B$.y=h0(B$.x,B$.z),B$.yaw=k(K,0)*Math.PI/180,B$.vy=0,B$.airborne=!1,l0=!0,D9)D9.position.set(B$.x,B$.y,B$.z)}),personAccessory:Y0("personAccessory",function(W){var X=N0(W,"nenhum");if(X!=="nenhum"&&X!=="jetpack"&&X!=="botas"){z0('não conheço o acessório "'+X+'" — tem: nenhum, jetpack, botas');return}if(!R$){z0('dê o acessório DEPOIS de "Criar o personagem a pé"');return}if(R$.acc=X,U&&D9)S4()}),personEmote:Y0("personEmote",function(W){var X=N0(W,"acenar");if(X==="pular"){if(B$&&!B$.airborne&&!B9)B$.vy=k(R$&&R$.jump,7),B$.airborne=!0;return}if(X!=="acenar"&&X!=="girar"&&X!=="dancar"){z0('não conheço "'+X+'" — tem: acenar, pular, girar, dancar');return}j8={kind:X,t:X==="dancar"?2:1.2}}),onVehicle:Y0("onVehicle",function(W,X){var K=N0(W,"entrar");if(K!=="entrar"&&K!=="sair"){z0('"Quando … do veículo" só conhece entrar e sair');return}if(typeof X!=="function"){z0('"Quando '+K+' do veículo" precisa de blocos de fazer dentro');return}hW[K].push(X)}),personPos:Y0("personPos",function(W){var X=R$&&!B9&&B$?B$:n;if(!X)return 0;var K=N0(W,"x");return K==="y"?X.y:K==="z"?X.z:X.x}),isDriving:Y0("isDriving",function(){return!!(B9&&(n||P9))}),waterfall:Y0("waterfall",function(W,X,K,H){if(!U){s0.push({kind:"waterfall",x:k(W,0),z:k(X,0),h:k(K,8),deg:k(H,0)});return}XY(W,X,K,H)}),lamp:Y0("lamp",function(W,X){if(!U){s0.push({kind:"lamp",x:k(W,0),z:k(X,0)});return}k4(W,X)}),city:Y0("city",function(W,X,K,H){if(l9){z0("já tem uma cidadezinha — só cabe UMA por mundo (mude o tamanho nela)");return}var B=N0(K,"media");if(!WY[B])z0('não conheço o tamanho "'+B+'" — usando media (tem: pequena, media, grande)'),B="media";var O=N0(H,"dia");if(O!=="dia"&&O!=="neon")z0('não conheço o modo "'+O+'" — usando dia (tem: dia, neon)'),O="dia";if(l9={x:k(W,0),z:k(X,0),r:WY[B],size:B,mode:O},hH(),!U){s0.push({kind:"city"});return}if(F8(),k$)q8();if(F0)H8();vY()}),district:Y0("district",function(W,X,K,H){var B=N0(W,"residencial");if(!f4[B])z0('não conheço o distrito "'+B+'" — usando residencial'),B="residencial";var O=k(X,0),D=k(K,0),j=f0(k(H,48),20,120);t9.push({kind:"flatten",x:O,z:D,r:j*0.72,y:k8(O,D)}),S0.push({x:O,z:D,r:j*0.72});var v={kind:"district",districtKind:B,x:O,z:D,size:j};if(!U){s0.push(v);return}if(F8(),k$)q8();if(F0)H8();SY({kind:"district",districtKind:B,x:O,z:D,size:j})}),roadGrid:Y0("roadGrid",function(W,X,K,H,B){var O=N0(W,"grade");if(O!=="grade"&&O!=="radial"&&O!=="organica")O="grade";var D={kind:"roadGrid",layout:O,x:k(X,0),z:k(K,0),size:f0(k(H,80),20,240),width:f0(k(B,6),2,18)};if(eH(D),!U){s0.push(D);return}if(F8(),k$)q8();if(F0)H8();TY(D)}),houseRow:Y0("houseRow",function(W,X,K,H,B,O){var D=N0(O,"coloridas");if(!b4[D])D="coloridas";var j={kind:"houseRow",n:k(W,8),x1:k(X,-30),z1:k(K,15),x2:k(H,30),z2:k(B,15),style:D};if(!U){s0.push(j);return}kY(j)}),quality:Y0("quality",function(W){$2(W)}),inventoryGive:Y0("inventoryGive",function(W,X){return yY(W,Math.max(0,Math.floor(k(X,1))))}),inventoryRemove:Y0("inventoryRemove",function(W,X){return yY(W,-Math.max(0,Math.floor(k(X,1))))}),inventoryCount:Y0("inventoryCount",function(W){return h4(W)}),inventoryHas:Y0("inventoryHas",function(W,X){return h4(W)>=Math.max(0,Math.floor(k(X,1)))}),crops:Y0("crops",function(W,X,K,H){var B=N0(X,"milho");if(!w4[B])z0('não conheço a plantação "'+B+'" — usando milho (tem: milho, alface, abobora)'),B="milho";var O={kind:"crops",n:k(W,4),kindName:B,x:k(K,0),z:k(H,20)};if(!U){s0.push(O);return}NY(O)}),barn:Y0("barn",function(W,X,K){var H={kind:"barn",x:k(W,0),z:k(X,0),deg:k(K,0)};if(!U){s0.push(H);return}OY(H)}),windmill:Y0("windmill",function(W,X){var K={kind:"windmill",x:k(W,0),z:k(X,0)};if(!U){s0.push(K);return}LY(K)}),fence:Y0("fence",function(W,X,K,H){var B={kind:"fence",x1:k(W,-8),z1:k(X,0),x2:k(K,8),z2:k(H,0)};if(!U){s0.push(B);return}IY(B)}),animals:Y0("animals",function(W,X,K,H,B){var O=N0(X,"galinhas");if(!_4[O])z0('não conheço o bichinho "'+O+'" — usando galinhas (tem: galinhas, vacas)'),O="galinhas";var D={kind:"animals",n:k(W,4),kindName:O,x:k(K,0),z:k(H,0),r:k(B,8)};if(!U){s0.push(D);return}DY(D)}),crater:Y0("crater",function(W,X,K){var H=f0(k(K,6),2,30);if(t9.push({kind:"crater",x:k(W,10),z:k(X,10),r:H,depth:1+H*0.16,rim:0.4+H*0.06}),U){if(F8(),k$)q8();if(F0)H8()}}),flag:Y0("flag",function(W,X,K){var H={kind:"flag",x:k(W,0),z:k(X,0),color:N0(K,"#ef4444")};if(!U){s0.push(H);return}PY(H)}),rocket:Y0("rocket",function(W,X){var K={kind:"rocket",x:k(W,0),z:k(X,0)};if(!U){s0.push(K);return}GY(K)}),door:Y0("door",function(W,X,K,H,B,O){var D={kind:"door",x:k(W,0),z:k(X,8),deg:k(K,0),title:N0(H,""),body:N0(B,""),image:N0(O,"")};if(!U){s0.push(D);return}BY(D)}),traffic:Y0("traffic",function(W,X){if(C5){z0("o trânsito já está ligado");return}var K=N0(X,"semaforos");if(K!=="semaforos"&&K!=="livre")z0('não conheço o modo "'+K+'" — usando semaforos (tem: semaforos, livre)'),K="semaforos";if(C5={n:Math.round(f0(k(W,6),1,12)),sem:K==="semaforos"},!U){s0.push({kind:"traffic"});return}jY()}),stringLights:Y0("stringLights",function(W,X,K,H){if(!U){s0.push({kind:"stringLights",x1:k(W,-8),z1:k(X,0),x2:k(K,8),z2:k(H,0)});return}z4(k(W,-8),k(X,0),k(K,8),k(H,0))}),fireflies:Y0("fireflies",function(W){var X=N0(W,"media");if(!(X in fY)){z0('não conheço "'+X+'" — tem: pouca, media, muita');return}if(!U){s0.push({kind:"fireflies",amount:X});return}bY(X)}),campfire:Y0("campfire",function(W,X){if(!U){s0.push({kind:"campfire",x:k(W,0),z:k(X,0)});return}hY(W,X)}),pushPlace:Y0("pushPlace",function(W,X,K){var H=N0(W,"tijolo");if(!x4[H]){z0('não conheço "'+H+'" — tem: tijolo, banco, cerca, lanterna, cone');return}if(!U){s0.push({kind:"pushPlace",thing:H,x:k(X,0),z:k(K,0)});return}g4(H,X,K)}),pushScatter:Y0("pushScatter",function(W,X,K,H){if(!U){s0.push({kind:"pushScatter",n:k(W,8),x:k(X,0),z:k(K,0),r:k(H,10)});return}v1(k(W,8),k(X,0),k(K,0),k(H,10))}),letters:Y0("letters",function(W,X,K,H){if(!U){s0.push({kind:"letters",word:N0(W,"OI"),x:k(X,0),z:k(K,0),s:k(H,1)});return}gY(W,X,K,H)}),explosive:Y0("explosive",function(W,X){if(!U){s0.push({kind:"explosive",x:k(W,0),z:k(X,0)});return}pY(W,X)}),onExplosion:Y0("onExplosion",function(W){if(typeof W!=="function"){z0('"Quando algo explodir" precisa de blocos de fazer dentro');return}YQ.push(W)}),clouds:Y0("clouds",function(W){var X=N0(W,"nenhuma");if(!(X in w1)){z0('não conheço "'+X+'" — tem: nenhuma, poucas, muitas');return}if(A9=X,U)_1()}),setWind:Y0("setWind",function(W){z5=f0(k(W,1),0,5)}),onDayNight:Y0("onDayNight",function(W,X){var K=N0(W,"noite");if(K!=="dia"&&K!=="noite")K="noite";if(typeof X!=="function"){z0('"Quando virar '+K+'" precisa de blocos de fazer dentro');return}pW[K].push(X)}),timeOfDay:Y0("timeOfDay",function(){return d7}),grass:Y0("grass",function(W){var X=N0(W,"media");if(!D4[X])X="media";if(PQ={amount:X},U)P4()}),setEffects:Y0("setEffects",function(W,X){var K=W===!0||W==="ligados"||W==="ligado"||W==="true";J.bloom=K,J.vignette=K,J.bloomStrength=f0(k(X,J.bloomStrength),0,3)}),onCrash:Y0("onCrash",function(W){if(typeof W!=="function"){z0('"Quando o carrinho bater forte" precisa de blocos de fazer dentro');return}Z7.push(W)}),loadSound:Y0("loadSound",function(W,X){var K=N0(W,""),H=OQ[N0(X,"")];if(!H){z0('o som "'+N0(X,"")+'" não está no projeto. Envie em "Sons", no menu ⋯');return}OQ[K]=H,H1(K)}),playSound:Y0("playSound",function(W){var X=H1(W);if(!X){C$("sound:"+N0(W,""),'o som "'+N0(W,"")+'" não foi carregado — use "Carregar o som"');return}try{X.currentTime=0;var K=X.play();if(K&&K.catch)K.catch(function(){})}catch(H){}}),playMusic:Y0("playMusic",function(W){var X=N0(W,""),K=OQ[X];if(!K){z0('a música "'+X+'" não está no projeto');return}try{if(D0&&t0===X){if(D0.paused===!0){var H=D0.play();if(H&&H.catch)H.catch(function(){})}return}if(D0)D0.pause();D0=new Audio(K),t0=X,D0.loop=!0,D0.volume=0.5;var B=D0.play();if(B&&B.catch)B.catch(function(){})}catch(O){}}),stopMusic:Y0("stopMusic",function(){try{if(D0)D0.pause(),D0.currentTime=0}catch(W){}D0=null,t0=null}),hud:Y0("hud",function(W,X){F1(X,W)}),say:Y0("say",function(W,X){B1(W,X)}),point:Y0("point",function(W,X,K){if(U)R4(W,X,K);else s0.push({kind:"point",name:N0(W,""),x:k(X,0),z:k(K,0)})}),onPoint:Y0("onPoint",function(W,X){if(typeof X!=="function"){z0('"Quando apertar E no ponto" precisa de blocos de fazer dentro');return}var K=N0(W,"");(q$[K]||(q$[K]=[])).push(X)}),zone:Y0("zone",function(W,X,K,H){if(U)O1(W,X,K,H);else s0.push({kind:"zone",name:N0(W,""),x:k(X,0),z:k(K,0),r:k(H,6)})}),onZone:Y0("onZone",function(W,X){if(typeof X!=="function"){z0('"Quando o carrinho entrar na área" precisa de blocos de fazer dentro');return}var K=N0(W,"");(i0[K]||(i0[K]=[])).push(X)}),totemText:Y0("totemText",function(W,X,K,H){if(U)kQ(k(W,0),k(X,0),K,H);else s0.push({kind:"totemText",x:k(W,0),z:k(X,0),title:N0(K,""),body:N0(H,"")})}),totemImage:Y0("totemImage",function(W,X,K,H){if(U)E4(k(W,0),k(X,0),K,H);else s0.push({kind:"totemImage",x:k(W,0),z:k(X,0),image:N0(K,""),w:k(H,3)})}),galleryCreate:Y0("galleryCreate",function(W,X,K){if(U)D1(W,X,K);else I1(W,X),s0.push({kind:"galleryCreate",x:k(W,0),z:k(X,0),title:N0(K,"Galeria")})}),galleryAdd:Y0("galleryAdd",function(W,X){if(U)P1(W,X);else s0.push({kind:"galleryAdd",image:N0(W,""),caption:N0(X,"")})}),raceCreate:Y0("raceCreate",function(W,X,K,H){fq(W,X,K,H)}),raceCheckpoint:Y0("raceCheckpoint",function(W,X,K){hq(W,X,K)}),raceOnStart:Y0("raceOnStart",function(W){if(typeof W==="function")u.start.push(W)}),raceOnCheckpoint:Y0("raceOnCheckpoint",function(W){if(typeof W==="function")u.checkpoint.push(W)}),raceOnFinish:Y0("raceOnFinish",function(W){if(typeof W==="function")u.finish.push(W)}),raceTime:Y0("raceTime",function(){return G0?G0.time:0}),raceBest:Y0("raceBest",function(){return G0?G0.best||0:0}),bowlingCreate:Y0("bowlingCreate",function(W,X,K){if(U)M1(W,X,K);else s0.push({kind:"bowling",x:k(W,0),z:k(X,0),yaw:k(K,0)})}),bowlingReset:Y0("bowlingReset",function(){lq()}),bowlingOnStrike:Y0("bowlingOnStrike",function(W){if(typeof W!=="function"){z0('"Quando derrubar todos os pinos" precisa de blocos de fazer dentro');return}if(!i)i={x:0,z:0,pins:[],strikeHooks:[]};i.strikeHooks.push(W)}),pinsDown:Y0("pinsDown",function(){if(!i)return 0;var W=0;for(var X=0;X<i.pins.length;X++)if(i.pins[X].down)W++;return W}),stack:Y0("stack",function(W,X,K,H){if(U)A1(W,X,K,H);else s0.push({kind:"stack",n:k(W,3),thing:N0(X,"caixas"),x:k(K,0),z:k(H,0)})}),knockedCount:Y0("knockedCount",function(){return pq()}),cameraMode:Y0("cameraMode",function(W){var X=N0(W,"seguir");if(X!=="seguir"&&X!=="topo"&&X!=="cinema"){z0('não conheço a câmera "'+X+'" — tem: seguir, topo, cinema');return}r0=X,l0=!0}),cameraShake:Y0("cameraShake",function(W,X){F$=f0(k(W,0.5),0,5),v0=Math.max(v0,f0(k(X,0.3),0.05,5))}),onUpdate:Y0("onUpdate",function(W){if(typeof W!=="function"){z0('"A cada quadro" precisa de um bloco de fazer dentro');return}P.push(W)}),keyDown:Y0("keyDown",function(W){return m$(T1(W))}),keyPressed:Y0("keyPressed",function(W){return R9(T1(W))})};if(Object.defineProperty(xQ,"runProject",{value:Y0("runProject",j2),enumerable:!1}),Object.defineProperty(xQ,"disposeAll",{value:Y0("disposeAll",u4),enumerable:!1}),typeof window<"u")window.SZWorld3D=xQ;else if(typeof globalThis<"u")globalThis.SZWorld3D=xQ})();
