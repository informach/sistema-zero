var oq=Object.defineProperty;var aq=($)=>$;function rq($,J){this[$]=aq.bind(null,J)}var pQ=($,J)=>{for(var Q in J)oq($,Q,{get:J[Q],enumerable:!0,configurable:!0,set:rq.bind(J,Q)})};var _5=($,J)=>()=>($&&(J=$($=0)),J);class _8{addEventListener($,J){if(this._listeners===void 0)this._listeners={};let Q=this._listeners;if(Q[$]===void 0)Q[$]=[];if(Q[$].indexOf(J)===-1)Q[$].push(J)}hasEventListener($,J){let Q=this._listeners;if(Q===void 0)return!1;return Q[$]!==void 0&&Q[$].indexOf(J)!==-1}removeEventListener($,J){let Q=this._listeners;if(Q===void 0)return;let Z=Q[$];if(Z!==void 0){let W=Z.indexOf(J);if(W!==-1)Z.splice(W,1)}}dispatchEvent($){let J=this._listeners;if(J===void 0)return;let Q=J[$.type];if(Q!==void 0){$.target=this;let Z=Q.slice(0);for(let W=0,K=Z.length;W<K;W++)Z[W].call(this,$);$.target=null}}}function b7(){let $=Math.random()*4294967295|0,J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(K7[$&255]+K7[$>>8&255]+K7[$>>16&255]+K7[$>>24&255]+"-"+K7[J&255]+K7[J>>8&255]+"-"+K7[J>>16&15|64]+K7[J>>24&255]+"-"+K7[Q&63|128]+K7[Q>>8&255]+"-"+K7[Q>>16&255]+K7[Q>>24&255]+K7[Z&255]+K7[Z>>8&255]+K7[Z>>16&255]+K7[Z>>24&255]).toLowerCase()}function G6($,J,Q){return Math.max(J,Math.min(Q,$))}function S1($,J){return($%J+J)%J}function tq($,J,Q,Z,W){return Z+($-J)*(W-Z)/(Q-J)}function eq($,J,Q){if($!==J)return(Q-$)/(J-$);else return 0}function d5($,J,Q){return(1-Q)*$+Q*J}function $X($,J,Q,Z){return d5($,J,1-Math.exp(-Q*Z))}function JX($,J=1){return J-Math.abs(S1($,J*2)-J)}function QX($,J,Q){if($<=J)return 0;if($>=Q)return 1;return $=($-J)/(Q-J),$*$*(3-2*$)}function ZX($,J,Q){if($<=J)return 0;if($>=Q)return 1;return $=($-J)/(Q-J),$*$*$*($*($*6-15)+10)}function WX($,J){return $+Math.floor(Math.random()*(J-$+1))}function KX($,J){return $+Math.random()*(J-$)}function UX($){return $*(0.5-Math.random())}function YX($){if($!==void 0)aW=$;let J=aW+=1831565813;return J=Math.imul(J^J>>>15,J|1),J^=J+Math.imul(J^J>>>7,J|61),((J^J>>>14)>>>0)/4294967296}function qX($){return $*m5}function XX($){return $*i$}function GX($){return($&$-1)===0&&$!==0}function VX($){return Math.pow(2,Math.ceil(Math.log($)/Math.LN2))}function BX($){return Math.pow(2,Math.floor(Math.log($)/Math.LN2))}function HX($,J,Q,Z,W){let{cos:K,sin:Y}=Math,q=K(Q/2),G=Y(Q/2),V=K((J+Z)/2),H=Y((J+Z)/2),N=K((J-Z)/2),O=Y((J-Z)/2),P=K((Z-J)/2),D=Y((Z-J)/2);switch(W){case"XYX":$.set(q*H,G*N,G*O,q*V);break;case"YZY":$.set(G*O,q*H,G*N,q*V);break;case"ZXZ":$.set(G*N,G*O,q*H,q*V);break;case"XZX":$.set(q*H,G*D,G*P,q*V);break;case"YXY":$.set(G*P,q*H,G*D,q*V);break;case"ZYZ":$.set(G*D,G*P,q*H,q*V);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+W)}}function h7($,J){switch(J.constructor){case Float32Array:return $;case Uint32Array:return $/4294967295;case Uint16Array:return $/65535;case Uint8Array:return $/255;case Int32Array:return Math.max($/2147483647,-1);case Int16Array:return Math.max($/32767,-1);case Int8Array:return Math.max($/127,-1);default:throw Error("Invalid component type.")}}function M6($,J){switch(J.constructor){case Float32Array:return $;case Uint32Array:return Math.round($*4294967295);case Uint16Array:return Math.round($*65535);case Uint8Array:return Math.round($*255);case Int32Array:return Math.round($*2147483647);case Int16Array:return Math.round($*32767);case Int8Array:return Math.round($*127);default:throw Error("Invalid component type.")}}class K6{constructor($,J,Q,Z,W,K,Y,q,G){if(K6.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],$!==void 0)this.set($,J,Q,Z,W,K,Y,q,G)}set($,J,Q,Z,W,K,Y,q,G){let V=this.elements;return V[0]=$,V[1]=Z,V[2]=Y,V[3]=J,V[4]=W,V[5]=q,V[6]=Q,V[7]=K,V[8]=G,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy($){let J=this.elements,Q=$.elements;return J[0]=Q[0],J[1]=Q[1],J[2]=Q[2],J[3]=Q[3],J[4]=Q[4],J[5]=Q[5],J[6]=Q[6],J[7]=Q[7],J[8]=Q[8],this}extractBasis($,J,Q){return $.setFromMatrix3Column(this,0),J.setFromMatrix3Column(this,1),Q.setFromMatrix3Column(this,2),this}setFromMatrix4($){let J=$.elements;return this.set(J[0],J[4],J[8],J[1],J[5],J[9],J[2],J[6],J[10]),this}multiply($){return this.multiplyMatrices(this,$)}premultiply($){return this.multiplyMatrices($,this)}multiplyMatrices($,J){let Q=$.elements,Z=J.elements,W=this.elements,K=Q[0],Y=Q[3],q=Q[6],G=Q[1],V=Q[4],H=Q[7],N=Q[2],O=Q[5],P=Q[8],D=Z[0],C=Z[3],z=Z[6],L=Z[1],T=Z[4],R=Z[7],v=Z[2],g=Z[5],y=Z[8];return W[0]=K*D+Y*L+q*v,W[3]=K*C+Y*T+q*g,W[6]=K*z+Y*R+q*y,W[1]=G*D+V*L+H*v,W[4]=G*C+V*T+H*g,W[7]=G*z+V*R+H*y,W[2]=N*D+O*L+P*v,W[5]=N*C+O*T+P*g,W[8]=N*z+O*R+P*y,this}multiplyScalar($){let J=this.elements;return J[0]*=$,J[3]*=$,J[6]*=$,J[1]*=$,J[4]*=$,J[7]*=$,J[2]*=$,J[5]*=$,J[8]*=$,this}determinant(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],W=$[3],K=$[4],Y=$[5],q=$[6],G=$[7],V=$[8];return J*K*V-J*Y*G-Q*W*V+Q*Y*q+Z*W*G-Z*K*q}invert(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],W=$[3],K=$[4],Y=$[5],q=$[6],G=$[7],V=$[8],H=V*K-Y*G,N=Y*q-V*W,O=G*W-K*q,P=J*H+Q*N+Z*O;if(P===0)return this.set(0,0,0,0,0,0,0,0,0);let D=1/P;return $[0]=H*D,$[1]=(Z*G-V*Q)*D,$[2]=(Y*Q-Z*K)*D,$[3]=N*D,$[4]=(V*J-Z*q)*D,$[5]=(Z*W-Y*J)*D,$[6]=O*D,$[7]=(Q*q-G*J)*D,$[8]=(K*J-Q*W)*D,this}transpose(){let $,J=this.elements;return $=J[1],J[1]=J[3],J[3]=$,$=J[2],J[2]=J[6],J[6]=$,$=J[5],J[5]=J[7],J[7]=$,this}getNormalMatrix($){return this.setFromMatrix4($).invert().transpose()}transposeIntoArray($){let J=this.elements;return $[0]=J[0],$[1]=J[3],$[2]=J[6],$[3]=J[1],$[4]=J[4],$[5]=J[7],$[6]=J[2],$[7]=J[5],$[8]=J[8],this}setUvTransform($,J,Q,Z,W,K,Y){let q=Math.cos(W),G=Math.sin(W);return this.set(Q*q,Q*G,-Q*(q*K+G*Y)+K+$,-Z*G,Z*q,-Z*(-G*K+q*Y)+Y+J,0,0,1),this}scale($,J){return this.premultiply(lQ.makeScale($,J)),this}rotate($){return this.premultiply(lQ.makeRotation(-$)),this}translate($,J){return this.premultiply(lQ.makeTranslation($,J)),this}makeTranslation($,J){if($.isVector2)this.set(1,0,$.x,0,1,$.y,0,0,1);else this.set(1,0,$,0,1,J,0,0,1);return this}makeRotation($){let J=Math.cos($),Q=Math.sin($);return this.set(J,-Q,0,Q,J,0,0,0,1),this}makeScale($,J){return this.set($,0,0,0,J,0,0,0,1),this}equals($){let J=this.elements,Q=$.elements;for(let Z=0;Z<9;Z++)if(J[Z]!==Q[Z])return!1;return!0}fromArray($,J=0){for(let Q=0;Q<9;Q++)this.elements[Q]=$[Q+J];return this}toArray($=[],J=0){let Q=this.elements;return $[J]=Q[0],$[J+1]=Q[1],$[J+2]=Q[2],$[J+3]=Q[3],$[J+4]=Q[4],$[J+5]=Q[5],$[J+6]=Q[6],$[J+7]=Q[7],$[J+8]=Q[8],$}clone(){return new this.constructor().fromArray(this.elements)}}function WK($){for(let J=$.length-1;J>=0;--J)if($[J]>=65535)return!0;return!1}function n5($){return document.createElementNS("http://www.w3.org/1999/xhtml",$)}function FX(){let $=n5("canvas");return $.style.display="block",$}function i5($){if($ in tW)return;tW[$]=!0,console.warn($)}function OX($,J,Q){return new Promise(function(Z,W){function K(){switch($.clientWaitSync(J,$.SYNC_FLUSH_COMMANDS_BIT,0)){case $.WAIT_FAILED:W();break;case $.TIMEOUT_EXPIRED:setTimeout(K,Q);break;default:Z()}}setTimeout(K,Q)})}function LX(){let $={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(W,K,Y){if(this.enabled===!1||K===Y||!K||!Y)return W;if(this.spaces[K].transfer==="srgb")W.r=X8(W.r),W.g=X8(W.g),W.b=X8(W.b);if(this.spaces[K].primaries!==this.spaces[Y].primaries)W.applyMatrix3(this.spaces[K].toXYZ),W.applyMatrix3(this.spaces[Y].fromXYZ);if(this.spaces[Y].transfer==="srgb")W.r=n$(W.r),W.g=n$(W.g),W.b=n$(W.b);return W},workingToColorSpace:function(W,K){return this.convert(W,this.workingColorSpace,K)},colorSpaceToWorking:function(W,K){return this.convert(W,K,this.workingColorSpace)},getPrimaries:function(W){return this.spaces[W].primaries},getTransfer:function(W){if(W==="")return"linear";return this.spaces[W].transfer},getToneMappingMode:function(W){return this.spaces[W].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(W,K=this.workingColorSpace){return W.fromArray(this.spaces[K].luminanceCoefficients)},define:function(W){Object.assign(this.spaces,W)},_getMatrix:function(W,K,Y){return W.copy(this.spaces[K].toXYZ).multiply(this.spaces[Y].fromXYZ)},_getDrawingBufferColorSpace:function(W){return this.spaces[W].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(W=this.workingColorSpace){return this.spaces[W].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(W,K){return i5("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),$.workingToColorSpace(W,K)},toWorkingColorSpace:function(W,K){return i5("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),$.colorSpaceToWorking(W,K)}},J=[0.64,0.33,0.3,0.6,0.15,0.06],Q=[0.2126,0.7152,0.0722],Z=[0.3127,0.329];return $.define({["srgb-linear"]:{primaries:J,whitePoint:Z,transfer:"linear",toXYZ:eW,fromXYZ:$4,luminanceCoefficients:Q,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:J,whitePoint:Z,transfer:"srgb",toXYZ:eW,fromXYZ:$4,luminanceCoefficients:Q,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),$}function X8($){return $<0.04045?$*0.0773993808:Math.pow($*0.9478672986+0.0521327014,2.4)}function n$($){return $<0.0031308?$*12.92:1.055*Math.pow($,0.41666)-0.055}class KK{static getDataURL($,J="image/png"){if(/^data:/i.test($.src))return $.src;if(typeof HTMLCanvasElement>"u")return $.src;let Q;if($ instanceof HTMLCanvasElement)Q=$;else{if(M$===void 0)M$=n5("canvas");M$.width=$.width,M$.height=$.height;let Z=M$.getContext("2d");if($ instanceof ImageData)Z.putImageData($,0,0);else Z.drawImage($,0,0,$.width,$.height);Q=M$}return Q.toDataURL(J)}static sRGBToLinear($){if(typeof HTMLImageElement<"u"&&$ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&$ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&$ instanceof ImageBitmap){let J=n5("canvas");J.width=$.width,J.height=$.height;let Q=J.getContext("2d");Q.drawImage($,0,0,$.width,$.height);let Z=Q.getImageData(0,0,$.width,$.height),W=Z.data;for(let K=0;K<W.length;K++)W[K]=X8(W[K]/255)*255;return Q.putImageData(Z,0,0),J}else if($.data){let J=$.data.slice(0);for(let Q=0;Q<J.length;Q++)if(J instanceof Uint8Array||J instanceof Uint8ClampedArray)J[Q]=Math.floor(X8(J[Q]/255)*255);else J[Q]=X8(J[Q]);return{data:J,width:$.width,height:$.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),$}}class SJ{constructor($=null){this.isSource=!0,Object.defineProperty(this,"id",{value:PX++}),this.uuid=b7(),this.data=$,this.dataReady=!0,this.version=0}getSize($){let J=this.data;if(typeof HTMLVideoElement<"u"&&J instanceof HTMLVideoElement)$.set(J.videoWidth,J.videoHeight,0);else if(J instanceof VideoFrame)$.set(J.displayHeight,J.displayWidth,0);else if(J!==null)$.set(J.width,J.height,J.depth||0);else $.set(0,0,0);return $}set needsUpdate($){if($===!0)this.version++}toJSON($){let J=$===void 0||typeof $==="string";if(!J&&$.images[this.uuid]!==void 0)return $.images[this.uuid];let Q={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let W;if(Array.isArray(Z)){W=[];for(let K=0,Y=Z.length;K<Y;K++)if(Z[K].isDataTexture)W.push(mQ(Z[K].image));else W.push(mQ(Z[K]))}else W=mQ(Z);Q.url=W}if(!J)$.images[this.uuid]=Q;return Q}}function mQ($){if(typeof HTMLImageElement<"u"&&$ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&$ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&$ instanceof ImageBitmap)return KK.getDataURL($);else if($.data)return{data:Array.from($.data),width:$.width,height:$.height,type:$.data.constructor.name};else return console.warn("THREE.Texture: Unable to serialize Texture."),{}}class i7{constructor($=new d(1/0,1/0,1/0),J=new d(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=$,this.max=J}set($,J){return this.min.copy($),this.max.copy(J),this}setFromArray($){this.makeEmpty();for(let J=0,Q=$.length;J<Q;J+=3)this.expandByPoint(v7.fromArray($,J));return this}setFromBufferAttribute($){this.makeEmpty();for(let J=0,Q=$.count;J<Q;J++)this.expandByPoint(v7.fromBufferAttribute($,J));return this}setFromPoints($){this.makeEmpty();for(let J=0,Q=$.length;J<Q;J++)this.expandByPoint($[J]);return this}setFromCenterAndSize($,J){let Q=v7.copy(J).multiplyScalar(0.5);return this.min.copy($).sub(Q),this.max.copy($).add(Q),this}setFromObject($,J=!1){return this.makeEmpty(),this.expandByObject($,J)}clone(){return new this.constructor().copy(this)}copy($){return this.min.copy($.min),this.max.copy($.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter($){return this.isEmpty()?$.set(0,0,0):$.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize($){return this.isEmpty()?$.set(0,0,0):$.subVectors(this.max,this.min)}expandByPoint($){return this.min.min($),this.max.max($),this}expandByVector($){return this.min.sub($),this.max.add($),this}expandByScalar($){return this.min.addScalar(-$),this.max.addScalar($),this}expandByObject($,J=!1){$.updateWorldMatrix(!1,!1);let Q=$.geometry;if(Q!==void 0){let W=Q.getAttribute("position");if(J===!0&&W!==void 0&&$.isInstancedMesh!==!0)for(let K=0,Y=W.count;K<Y;K++){if($.isMesh===!0)$.getVertexPosition(K,v7);else v7.fromBufferAttribute(W,K);v7.applyMatrix4($.matrixWorld),this.expandByPoint(v7)}else{if($.boundingBox!==void 0){if($.boundingBox===null)$.computeBoundingBox();n9.copy($.boundingBox)}else{if(Q.boundingBox===null)Q.computeBoundingBox();n9.copy(Q.boundingBox)}n9.applyMatrix4($.matrixWorld),this.union(n9)}}let Z=$.children;for(let W=0,K=Z.length;W<K;W++)this.expandByObject(Z[W],J);return this}containsPoint($){return $.x>=this.min.x&&$.x<=this.max.x&&$.y>=this.min.y&&$.y<=this.max.y&&$.z>=this.min.z&&$.z<=this.max.z}containsBox($){return this.min.x<=$.min.x&&$.max.x<=this.max.x&&this.min.y<=$.min.y&&$.max.y<=this.max.y&&this.min.z<=$.min.z&&$.max.z<=this.max.z}getParameter($,J){return J.set(($.x-this.min.x)/(this.max.x-this.min.x),($.y-this.min.y)/(this.max.y-this.min.y),($.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox($){return $.max.x>=this.min.x&&$.min.x<=this.max.x&&$.max.y>=this.min.y&&$.min.y<=this.max.y&&$.max.z>=this.min.z&&$.min.z<=this.max.z}intersectsSphere($){return this.clampPoint($.center,v7),v7.distanceToSquared($.center)<=$.radius*$.radius}intersectsPlane($){let J,Q;if($.normal.x>0)J=$.normal.x*this.min.x,Q=$.normal.x*this.max.x;else J=$.normal.x*this.max.x,Q=$.normal.x*this.min.x;if($.normal.y>0)J+=$.normal.y*this.min.y,Q+=$.normal.y*this.max.y;else J+=$.normal.y*this.max.y,Q+=$.normal.y*this.min.y;if($.normal.z>0)J+=$.normal.z*this.min.z,Q+=$.normal.z*this.max.z;else J+=$.normal.z*this.max.z,Q+=$.normal.z*this.min.z;return J<=-$.constant&&Q>=-$.constant}intersectsTriangle($){if(this.isEmpty())return!1;this.getCenter(y5),i9.subVectors(this.max,y5),T$.subVectors($.a,y5),k$.subVectors($.b,y5),v$.subVectors($.c,y5),S8.subVectors(k$,T$),A8.subVectors(v$,k$),J$.subVectors(T$,v$);let J=[0,-S8.z,S8.y,0,-A8.z,A8.y,0,-J$.z,J$.y,S8.z,0,-S8.x,A8.z,0,-A8.x,J$.z,0,-J$.x,-S8.y,S8.x,0,-A8.y,A8.x,0,-J$.y,J$.x,0];if(!cQ(J,T$,k$,v$,i9))return!1;if(J=[1,0,0,0,1,0,0,0,1],!cQ(J,T$,k$,v$,i9))return!1;return s9.crossVectors(S8,A8),J=[s9.x,s9.y,s9.z],cQ(J,T$,k$,v$,i9)}clampPoint($,J){return J.copy($).clamp(this.min,this.max)}distanceToPoint($){return this.clampPoint($,v7).distanceTo($)}getBoundingSphere($){if(this.isEmpty())$.makeEmpty();else this.getCenter($.center),$.radius=this.getSize(v7).length()*0.5;return $}intersect($){if(this.min.max($.min),this.max.min($.max),this.isEmpty())this.makeEmpty();return this}union($){return this.min.min($.min),this.max.max($.max),this}applyMatrix4($){if(this.isEmpty())return this;return J8[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4($),J8[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4($),J8[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4($),J8[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4($),J8[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4($),J8[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4($),J8[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4($),J8[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4($),this.setFromPoints(J8),this}translate($){return this.min.add($),this.max.add($),this}equals($){return $.min.equals(this.min)&&$.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON($){return this.min.fromArray($.min),this.max.fromArray($.max),this}}function cQ($,J,Q,Z,W){for(let K=0,Y=$.length-3;K<=Y;K+=3){Q$.fromArray($,K);let q=W.x*Math.abs(Q$.x)+W.y*Math.abs(Q$.y)+W.z*Math.abs(Q$.z),G=J.dot(Q$),V=Q.dot(Q$),H=Z.dot(Q$);if(Math.max(-Math.max(G,V,H),Math.min(G,V,H))>q)return!1}return!0}class g7{constructor($=new d,J=-1){this.isSphere=!0,this.center=$,this.radius=J}set($,J){return this.center.copy($),this.radius=J,this}setFromPoints($,J){let Q=this.center;if(J!==void 0)Q.copy(J);else IX.setFromPoints($).getCenter(Q);let Z=0;for(let W=0,K=$.length;W<K;W++)Z=Math.max(Z,Q.distanceToSquared($[W]));return this.radius=Math.sqrt(Z),this}copy($){return this.center.copy($.center),this.radius=$.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint($){return $.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint($){return $.distanceTo(this.center)-this.radius}intersectsSphere($){let J=this.radius+$.radius;return $.center.distanceToSquared(this.center)<=J*J}intersectsBox($){return $.intersectsSphere(this)}intersectsPlane($){return Math.abs($.distanceToPoint(this.center))<=this.radius}clampPoint($,J){let Q=this.center.distanceToSquared($);if(J.copy($),Q>this.radius*this.radius)J.sub(this.center).normalize(),J.multiplyScalar(this.radius).add(this.center);return J}getBoundingBox($){if(this.isEmpty())return $.makeEmpty(),$;return $.set(this.center,this.center),$.expandByScalar(this.radius),$}applyMatrix4($){return this.center.applyMatrix4($),this.radius=this.radius*$.getMaxScaleOnAxis(),this}translate($){return this.center.add($),this}expandByPoint($){if(this.isEmpty())return this.center.copy($),this.radius=0,this;h5.subVectors($,this.center);let J=h5.lengthSq();if(J>this.radius*this.radius){let Q=Math.sqrt(J),Z=(Q-this.radius)*0.5;this.center.addScaledVector(h5,Z/Q),this.radius+=Z}return this}union($){if($.isEmpty())return this;if(this.isEmpty())return this.copy($),this;if(this.center.equals($.center)===!0)this.radius=Math.max(this.radius,$.radius);else nQ.subVectors($.center,this.center).setLength($.radius),this.expandByPoint(h5.copy($.center).add(nQ)),this.expandByPoint(h5.copy($.center).sub(nQ));return this}equals($){return $.center.equals(this.center)&&$.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON($){return this.radius=$.radius,this.center.fromArray($.center),this}}class r${constructor($=new d,J=new d(0,0,-1)){this.origin=$,this.direction=J}set($,J){return this.origin.copy($),this.direction.copy(J),this}copy($){return this.origin.copy($.origin),this.direction.copy($.direction),this}at($,J){return J.copy(this.origin).addScaledVector(this.direction,$)}lookAt($){return this.direction.copy($).sub(this.origin).normalize(),this}recast($){return this.origin.copy(this.at($,Q8)),this}closestPointToPoint($,J){J.subVectors($,this.origin);let Q=J.dot(this.direction);if(Q<0)return J.copy(this.origin);return J.copy(this.origin).addScaledVector(this.direction,Q)}distanceToPoint($){return Math.sqrt(this.distanceSqToPoint($))}distanceSqToPoint($){let J=Q8.subVectors($,this.origin).dot(this.direction);if(J<0)return this.origin.distanceToSquared($);return Q8.copy(this.origin).addScaledVector(this.direction,J),Q8.distanceToSquared($)}distanceSqToSegment($,J,Q,Z){iQ.copy($).add(J).multiplyScalar(0.5),o9.copy(J).sub($).normalize(),j8.copy(this.origin).sub(iQ);let W=$.distanceTo(J)*0.5,K=-this.direction.dot(o9),Y=j8.dot(this.direction),q=-j8.dot(o9),G=j8.lengthSq(),V=Math.abs(1-K*K),H,N,O,P;if(V>0)if(H=K*q-Y,N=K*Y-q,P=W*V,H>=0)if(N>=-P)if(N<=P){let D=1/V;H*=D,N*=D,O=H*(H+K*N+2*Y)+N*(K*H+N+2*q)+G}else N=W,H=Math.max(0,-(K*N+Y)),O=-H*H+N*(N+2*q)+G;else N=-W,H=Math.max(0,-(K*N+Y)),O=-H*H+N*(N+2*q)+G;else if(N<=-P)H=Math.max(0,-(-K*W+Y)),N=H>0?-W:Math.min(Math.max(-W,-q),W),O=-H*H+N*(N+2*q)+G;else if(N<=P)H=0,N=Math.min(Math.max(-W,-q),W),O=N*(N+2*q)+G;else H=Math.max(0,-(K*W+Y)),N=H>0?W:Math.min(Math.max(-W,-q),W),O=-H*H+N*(N+2*q)+G;else N=K>0?-W:W,H=Math.max(0,-(K*N+Y)),O=-H*H+N*(N+2*q)+G;if(Q)Q.copy(this.origin).addScaledVector(this.direction,H);if(Z)Z.copy(iQ).addScaledVector(o9,N);return O}intersectSphere($,J){Q8.subVectors($.center,this.origin);let Q=Q8.dot(this.direction),Z=Q8.dot(Q8)-Q*Q,W=$.radius*$.radius;if(Z>W)return null;let K=Math.sqrt(W-Z),Y=Q-K,q=Q+K;if(q<0)return null;if(Y<0)return this.at(q,J);return this.at(Y,J)}intersectsSphere($){if($.radius<0)return!1;return this.distanceSqToPoint($.center)<=$.radius*$.radius}distanceToPlane($){let J=$.normal.dot(this.direction);if(J===0){if($.distanceToPoint(this.origin)===0)return 0;return null}let Q=-(this.origin.dot($.normal)+$.constant)/J;return Q>=0?Q:null}intersectPlane($,J){let Q=this.distanceToPlane($);if(Q===null)return null;return this.at(Q,J)}intersectsPlane($){let J=$.distanceToPoint(this.origin);if(J===0)return!0;if($.normal.dot(this.direction)*J<0)return!0;return!1}intersectBox($,J){let Q,Z,W,K,Y,q,G=1/this.direction.x,V=1/this.direction.y,H=1/this.direction.z,N=this.origin;if(G>=0)Q=($.min.x-N.x)*G,Z=($.max.x-N.x)*G;else Q=($.max.x-N.x)*G,Z=($.min.x-N.x)*G;if(V>=0)W=($.min.y-N.y)*V,K=($.max.y-N.y)*V;else W=($.max.y-N.y)*V,K=($.min.y-N.y)*V;if(Q>K||W>Z)return null;if(W>Q||isNaN(Q))Q=W;if(K<Z||isNaN(Z))Z=K;if(H>=0)Y=($.min.z-N.z)*H,q=($.max.z-N.z)*H;else Y=($.max.z-N.z)*H,q=($.min.z-N.z)*H;if(Q>q||Y>Z)return null;if(Y>Q||Q!==Q)Q=Y;if(q<Z||Z!==Z)Z=q;if(Z<0)return null;return this.at(Q>=0?Q:Z,J)}intersectsBox($){return this.intersectBox($,Q8)!==null}intersectTriangle($,J,Q,Z,W){sQ.subVectors(J,$),a9.subVectors(Q,$),oQ.crossVectors(sQ,a9);let K=this.direction.dot(oQ),Y;if(K>0){if(Z)return null;Y=1}else if(K<0)Y=-1,K=-K;else return null;j8.subVectors(this.origin,$);let q=Y*this.direction.dot(a9.crossVectors(j8,a9));if(q<0)return null;let G=Y*this.direction.dot(sQ.cross(j8));if(G<0)return null;if(q+G>K)return null;let V=-Y*j8.dot(oQ);if(V<0)return null;return this.at(V/K,W)}applyMatrix4($){return this.origin.applyMatrix4($),this.direction.transformDirection($),this}equals($){return $.origin.equals(this.origin)&&$.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class q6{constructor($,J,Q,Z,W,K,Y,q,G,V,H,N,O,P,D,C){if(q6.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],$!==void 0)this.set($,J,Q,Z,W,K,Y,q,G,V,H,N,O,P,D,C)}set($,J,Q,Z,W,K,Y,q,G,V,H,N,O,P,D,C){let z=this.elements;return z[0]=$,z[4]=J,z[8]=Q,z[12]=Z,z[1]=W,z[5]=K,z[9]=Y,z[13]=q,z[2]=G,z[6]=V,z[10]=H,z[14]=N,z[3]=O,z[7]=P,z[11]=D,z[15]=C,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new q6().fromArray(this.elements)}copy($){let J=this.elements,Q=$.elements;return J[0]=Q[0],J[1]=Q[1],J[2]=Q[2],J[3]=Q[3],J[4]=Q[4],J[5]=Q[5],J[6]=Q[6],J[7]=Q[7],J[8]=Q[8],J[9]=Q[9],J[10]=Q[10],J[11]=Q[11],J[12]=Q[12],J[13]=Q[13],J[14]=Q[14],J[15]=Q[15],this}copyPosition($){let J=this.elements,Q=$.elements;return J[12]=Q[12],J[13]=Q[13],J[14]=Q[14],this}setFromMatrix3($){let J=$.elements;return this.set(J[0],J[3],J[6],0,J[1],J[4],J[7],0,J[2],J[5],J[8],0,0,0,0,1),this}extractBasis($,J,Q){return $.setFromMatrixColumn(this,0),J.setFromMatrixColumn(this,1),Q.setFromMatrixColumn(this,2),this}makeBasis($,J,Q){return this.set($.x,J.x,Q.x,0,$.y,J.y,Q.y,0,$.z,J.z,Q.z,0,0,0,0,1),this}extractRotation($){let J=this.elements,Q=$.elements,Z=1/_$.setFromMatrixColumn($,0).length(),W=1/_$.setFromMatrixColumn($,1).length(),K=1/_$.setFromMatrixColumn($,2).length();return J[0]=Q[0]*Z,J[1]=Q[1]*Z,J[2]=Q[2]*Z,J[3]=0,J[4]=Q[4]*W,J[5]=Q[5]*W,J[6]=Q[6]*W,J[7]=0,J[8]=Q[8]*K,J[9]=Q[9]*K,J[10]=Q[10]*K,J[11]=0,J[12]=0,J[13]=0,J[14]=0,J[15]=1,this}makeRotationFromEuler($){let J=this.elements,Q=$.x,Z=$.y,W=$.z,K=Math.cos(Q),Y=Math.sin(Q),q=Math.cos(Z),G=Math.sin(Z),V=Math.cos(W),H=Math.sin(W);if($.order==="XYZ"){let N=K*V,O=K*H,P=Y*V,D=Y*H;J[0]=q*V,J[4]=-q*H,J[8]=G,J[1]=O+P*G,J[5]=N-D*G,J[9]=-Y*q,J[2]=D-N*G,J[6]=P+O*G,J[10]=K*q}else if($.order==="YXZ"){let N=q*V,O=q*H,P=G*V,D=G*H;J[0]=N+D*Y,J[4]=P*Y-O,J[8]=K*G,J[1]=K*H,J[5]=K*V,J[9]=-Y,J[2]=O*Y-P,J[6]=D+N*Y,J[10]=K*q}else if($.order==="ZXY"){let N=q*V,O=q*H,P=G*V,D=G*H;J[0]=N-D*Y,J[4]=-K*H,J[8]=P+O*Y,J[1]=O+P*Y,J[5]=K*V,J[9]=D-N*Y,J[2]=-K*G,J[6]=Y,J[10]=K*q}else if($.order==="ZYX"){let N=K*V,O=K*H,P=Y*V,D=Y*H;J[0]=q*V,J[4]=P*G-O,J[8]=N*G+D,J[1]=q*H,J[5]=D*G+N,J[9]=O*G-P,J[2]=-G,J[6]=Y*q,J[10]=K*q}else if($.order==="YZX"){let N=K*q,O=K*G,P=Y*q,D=Y*G;J[0]=q*V,J[4]=D-N*H,J[8]=P*H+O,J[1]=H,J[5]=K*V,J[9]=-Y*V,J[2]=-G*V,J[6]=O*H+P,J[10]=N-D*H}else if($.order==="XZY"){let N=K*q,O=K*G,P=Y*q,D=Y*G;J[0]=q*V,J[4]=-H,J[8]=G*V,J[1]=N*H+D,J[5]=K*V,J[9]=O*H-P,J[2]=P*H-O,J[6]=Y*V,J[10]=D*H+N}return J[3]=0,J[7]=0,J[11]=0,J[12]=0,J[13]=0,J[14]=0,J[15]=1,this}makeRotationFromQuaternion($){return this.compose(DX,$,CX)}lookAt($,J,Q){let Z=this.elements;if(I7.subVectors($,J),I7.lengthSq()===0)I7.z=1;if(I7.normalize(),w8.crossVectors(Q,I7),w8.lengthSq()===0){if(Math.abs(Q.z)===1)I7.x+=0.0001;else I7.z+=0.0001;I7.normalize(),w8.crossVectors(Q,I7)}return w8.normalize(),r9.crossVectors(I7,w8),Z[0]=w8.x,Z[4]=r9.x,Z[8]=I7.x,Z[1]=w8.y,Z[5]=r9.y,Z[9]=I7.y,Z[2]=w8.z,Z[6]=r9.z,Z[10]=I7.z,this}multiply($){return this.multiplyMatrices(this,$)}premultiply($){return this.multiplyMatrices($,this)}multiplyMatrices($,J){let Q=$.elements,Z=J.elements,W=this.elements,K=Q[0],Y=Q[4],q=Q[8],G=Q[12],V=Q[1],H=Q[5],N=Q[9],O=Q[13],P=Q[2],D=Q[6],C=Q[10],z=Q[14],L=Q[3],T=Q[7],R=Q[11],v=Q[15],g=Z[0],y=Z[4],M=Z[8],p=Z[12],A=Z[1],j=Z[5],h=Z[9],l=Z[13],m=Z[2],n=Z[6],o=Z[10],$0=Z[14],F0=Z[3],J0=Z[7],I0=Z[11],y0=Z[15];return W[0]=K*g+Y*A+q*m+G*F0,W[4]=K*y+Y*j+q*n+G*J0,W[8]=K*M+Y*h+q*o+G*I0,W[12]=K*p+Y*l+q*$0+G*y0,W[1]=V*g+H*A+N*m+O*F0,W[5]=V*y+H*j+N*n+O*J0,W[9]=V*M+H*h+N*o+O*I0,W[13]=V*p+H*l+N*$0+O*y0,W[2]=P*g+D*A+C*m+z*F0,W[6]=P*y+D*j+C*n+z*J0,W[10]=P*M+D*h+C*o+z*I0,W[14]=P*p+D*l+C*$0+z*y0,W[3]=L*g+T*A+R*m+v*F0,W[7]=L*y+T*j+R*n+v*J0,W[11]=L*M+T*h+R*o+v*I0,W[15]=L*p+T*l+R*$0+v*y0,this}multiplyScalar($){let J=this.elements;return J[0]*=$,J[4]*=$,J[8]*=$,J[12]*=$,J[1]*=$,J[5]*=$,J[9]*=$,J[13]*=$,J[2]*=$,J[6]*=$,J[10]*=$,J[14]*=$,J[3]*=$,J[7]*=$,J[11]*=$,J[15]*=$,this}determinant(){let $=this.elements,J=$[0],Q=$[4],Z=$[8],W=$[12],K=$[1],Y=$[5],q=$[9],G=$[13],V=$[2],H=$[6],N=$[10],O=$[14],P=$[3],D=$[7],C=$[11],z=$[15];return P*(+W*q*H-Z*G*H-W*Y*N+Q*G*N+Z*Y*O-Q*q*O)+D*(+J*q*O-J*G*N+W*K*N-Z*K*O+Z*G*V-W*q*V)+C*(+J*G*H-J*Y*O-W*K*H+Q*K*O+W*Y*V-Q*G*V)+z*(-Z*Y*V-J*q*H+J*Y*N+Z*K*H-Q*K*N+Q*q*V)}transpose(){let $=this.elements,J;return J=$[1],$[1]=$[4],$[4]=J,J=$[2],$[2]=$[8],$[8]=J,J=$[6],$[6]=$[9],$[9]=J,J=$[3],$[3]=$[12],$[12]=J,J=$[7],$[7]=$[13],$[13]=J,J=$[11],$[11]=$[14],$[14]=J,this}setPosition($,J,Q){let Z=this.elements;if($.isVector3)Z[12]=$.x,Z[13]=$.y,Z[14]=$.z;else Z[12]=$,Z[13]=J,Z[14]=Q;return this}invert(){let $=this.elements,J=$[0],Q=$[1],Z=$[2],W=$[3],K=$[4],Y=$[5],q=$[6],G=$[7],V=$[8],H=$[9],N=$[10],O=$[11],P=$[12],D=$[13],C=$[14],z=$[15],L=H*C*G-D*N*G+D*q*O-Y*C*O-H*q*z+Y*N*z,T=P*N*G-V*C*G-P*q*O+K*C*O+V*q*z-K*N*z,R=V*D*G-P*H*G+P*Y*O-K*D*O-V*Y*z+K*H*z,v=P*H*q-V*D*q-P*Y*N+K*D*N+V*Y*C-K*H*C,g=J*L+Q*T+Z*R+W*v;if(g===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let y=1/g;return $[0]=L*y,$[1]=(D*N*W-H*C*W-D*Z*O+Q*C*O+H*Z*z-Q*N*z)*y,$[2]=(Y*C*W-D*q*W+D*Z*G-Q*C*G-Y*Z*z+Q*q*z)*y,$[3]=(H*q*W-Y*N*W-H*Z*G+Q*N*G+Y*Z*O-Q*q*O)*y,$[4]=T*y,$[5]=(V*C*W-P*N*W+P*Z*O-J*C*O-V*Z*z+J*N*z)*y,$[6]=(P*q*W-K*C*W-P*Z*G+J*C*G+K*Z*z-J*q*z)*y,$[7]=(K*N*W-V*q*W+V*Z*G-J*N*G-K*Z*O+J*q*O)*y,$[8]=R*y,$[9]=(P*H*W-V*D*W-P*Q*O+J*D*O+V*Q*z-J*H*z)*y,$[10]=(K*D*W-P*Y*W+P*Q*G-J*D*G-K*Q*z+J*Y*z)*y,$[11]=(V*Y*W-K*H*W-V*Q*G+J*H*G+K*Q*O-J*Y*O)*y,$[12]=v*y,$[13]=(V*D*Z-P*H*Z+P*Q*N-J*D*N-V*Q*C+J*H*C)*y,$[14]=(P*Y*Z-K*D*Z-P*Q*q+J*D*q+K*Q*C-J*Y*C)*y,$[15]=(K*H*Z-V*Y*Z+V*Q*q-J*H*q-K*Q*N+J*Y*N)*y,this}scale($){let J=this.elements,Q=$.x,Z=$.y,W=$.z;return J[0]*=Q,J[4]*=Z,J[8]*=W,J[1]*=Q,J[5]*=Z,J[9]*=W,J[2]*=Q,J[6]*=Z,J[10]*=W,J[3]*=Q,J[7]*=Z,J[11]*=W,this}getMaxScaleOnAxis(){let $=this.elements,J=$[0]*$[0]+$[1]*$[1]+$[2]*$[2],Q=$[4]*$[4]+$[5]*$[5]+$[6]*$[6],Z=$[8]*$[8]+$[9]*$[9]+$[10]*$[10];return Math.sqrt(Math.max(J,Q,Z))}makeTranslation($,J,Q){if($.isVector3)this.set(1,0,0,$.x,0,1,0,$.y,0,0,1,$.z,0,0,0,1);else this.set(1,0,0,$,0,1,0,J,0,0,1,Q,0,0,0,1);return this}makeRotationX($){let J=Math.cos($),Q=Math.sin($);return this.set(1,0,0,0,0,J,-Q,0,0,Q,J,0,0,0,0,1),this}makeRotationY($){let J=Math.cos($),Q=Math.sin($);return this.set(J,0,Q,0,0,1,0,0,-Q,0,J,0,0,0,0,1),this}makeRotationZ($){let J=Math.cos($),Q=Math.sin($);return this.set(J,-Q,0,0,Q,J,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis($,J){let Q=Math.cos(J),Z=Math.sin(J),W=1-Q,K=$.x,Y=$.y,q=$.z,G=W*K,V=W*Y;return this.set(G*K+Q,G*Y-Z*q,G*q+Z*Y,0,G*Y+Z*q,V*Y+Q,V*q-Z*K,0,G*q-Z*Y,V*q+Z*K,W*q*q+Q,0,0,0,0,1),this}makeScale($,J,Q){return this.set($,0,0,0,0,J,0,0,0,0,Q,0,0,0,0,1),this}makeShear($,J,Q,Z,W,K){return this.set(1,Q,W,0,$,1,K,0,J,Z,1,0,0,0,0,1),this}compose($,J,Q){let Z=this.elements,W=J._x,K=J._y,Y=J._z,q=J._w,G=W+W,V=K+K,H=Y+Y,N=W*G,O=W*V,P=W*H,D=K*V,C=K*H,z=Y*H,L=q*G,T=q*V,R=q*H,v=Q.x,g=Q.y,y=Q.z;return Z[0]=(1-(D+z))*v,Z[1]=(O+R)*v,Z[2]=(P-T)*v,Z[3]=0,Z[4]=(O-R)*g,Z[5]=(1-(N+z))*g,Z[6]=(C+L)*g,Z[7]=0,Z[8]=(P+T)*y,Z[9]=(C-L)*y,Z[10]=(1-(N+D))*y,Z[11]=0,Z[12]=$.x,Z[13]=$.y,Z[14]=$.z,Z[15]=1,this}decompose($,J,Q){let Z=this.elements,W=_$.set(Z[0],Z[1],Z[2]).length(),K=_$.set(Z[4],Z[5],Z[6]).length(),Y=_$.set(Z[8],Z[9],Z[10]).length();if(this.determinant()<0)W=-W;$.x=Z[12],$.y=Z[13],$.z=Z[14],_7.copy(this);let G=1/W,V=1/K,H=1/Y;return _7.elements[0]*=G,_7.elements[1]*=G,_7.elements[2]*=G,_7.elements[4]*=V,_7.elements[5]*=V,_7.elements[6]*=V,_7.elements[8]*=H,_7.elements[9]*=H,_7.elements[10]*=H,J.setFromRotationMatrix(_7),Q.x=W,Q.y=K,Q.z=Y,this}makePerspective($,J,Q,Z,W,K,Y=2000,q=!1){let G=this.elements,V=2*W/(J-$),H=2*W/(Q-Z),N=(J+$)/(J-$),O=(Q+Z)/(Q-Z),P,D;if(q)P=W/(K-W),D=K*W/(K-W);else if(Y===2000)P=-(K+W)/(K-W),D=-2*K*W/(K-W);else if(Y===2001)P=-K/(K-W),D=-K*W/(K-W);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+Y);return G[0]=V,G[4]=0,G[8]=N,G[12]=0,G[1]=0,G[5]=H,G[9]=O,G[13]=0,G[2]=0,G[6]=0,G[10]=P,G[14]=D,G[3]=0,G[7]=0,G[11]=-1,G[15]=0,this}makeOrthographic($,J,Q,Z,W,K,Y=2000,q=!1){let G=this.elements,V=2/(J-$),H=2/(Q-Z),N=-(J+$)/(J-$),O=-(Q+Z)/(Q-Z),P,D;if(q)P=1/(K-W),D=K/(K-W);else if(Y===2000)P=-2/(K-W),D=-(K+W)/(K-W);else if(Y===2001)P=-1/(K-W),D=-W/(K-W);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+Y);return G[0]=V,G[4]=0,G[8]=0,G[12]=N,G[1]=0,G[5]=H,G[9]=0,G[13]=O,G[2]=0,G[6]=0,G[10]=P,G[14]=D,G[3]=0,G[7]=0,G[11]=0,G[15]=1,this}equals($){let J=this.elements,Q=$.elements;for(let Z=0;Z<16;Z++)if(J[Z]!==Q[Z])return!1;return!0}fromArray($,J=0){for(let Q=0;Q<16;Q++)this.elements[Q]=$[Q+J];return this}toArray($=[],J=0){let Q=this.elements;return $[J]=Q[0],$[J+1]=Q[1],$[J+2]=Q[2],$[J+3]=Q[3],$[J+4]=Q[4],$[J+5]=Q[5],$[J+6]=Q[6],$[J+7]=Q[7],$[J+8]=Q[8],$[J+9]=Q[9],$[J+10]=Q[10],$[J+11]=Q[11],$[J+12]=Q[12],$[J+13]=Q[13],$[J+14]=Q[14],$[J+15]=Q[15],$}}class AJ{constructor(){this.mask=1}set($){this.mask=(1<<$|0)>>>0}enable($){this.mask|=1<<$|0}enableAll(){this.mask=-1}toggle($){this.mask^=1<<$|0}disable($){this.mask&=~(1<<$|0)}disableAll(){this.mask=0}test($){return(this.mask&$.mask)!==0}isEnabled($){return(this.mask&(1<<$|0))!==0}}class x7{constructor($=new d,J=new d,Q=new d){this.a=$,this.b=J,this.c=Q}static getNormal($,J,Q,Z){Z.subVectors(Q,J),y7.subVectors($,J),Z.cross(y7);let W=Z.lengthSq();if(W>0)return Z.multiplyScalar(1/Math.sqrt(W));return Z.set(0,0,0)}static getBarycoord($,J,Q,Z,W){y7.subVectors(Z,J),W8.subVectors(Q,J),rQ.subVectors($,J);let K=y7.dot(y7),Y=y7.dot(W8),q=y7.dot(rQ),G=W8.dot(W8),V=W8.dot(rQ),H=K*G-Y*Y;if(H===0)return W.set(0,0,0),null;let N=1/H,O=(G*q-Y*V)*N,P=(K*V-Y*q)*N;return W.set(1-O-P,P,O)}static containsPoint($,J,Q,Z){if(this.getBarycoord($,J,Q,Z,K8)===null)return!1;return K8.x>=0&&K8.y>=0&&K8.x+K8.y<=1}static getInterpolation($,J,Q,Z,W,K,Y,q){if(this.getBarycoord($,J,Q,Z,K8)===null){if(q.x=0,q.y=0,"z"in q)q.z=0;if("w"in q)q.w=0;return null}return q.setScalar(0),q.addScaledVector(W,K8.x),q.addScaledVector(K,K8.y),q.addScaledVector(Y,K8.z),q}static getInterpolatedAttribute($,J,Q,Z,W,K){return J1.setScalar(0),Q1.setScalar(0),Z1.setScalar(0),J1.fromBufferAttribute($,J),Q1.fromBufferAttribute($,Q),Z1.fromBufferAttribute($,Z),K.setScalar(0),K.addScaledVector(J1,W.x),K.addScaledVector(Q1,W.y),K.addScaledVector(Z1,W.z),K}static isFrontFacing($,J,Q,Z){return y7.subVectors(Q,J),W8.subVectors($,J),y7.cross(W8).dot(Z)<0?!0:!1}set($,J,Q){return this.a.copy($),this.b.copy(J),this.c.copy(Q),this}setFromPointsAndIndices($,J,Q,Z){return this.a.copy($[J]),this.b.copy($[Q]),this.c.copy($[Z]),this}setFromAttributeAndIndices($,J,Q,Z){return this.a.fromBufferAttribute($,J),this.b.fromBufferAttribute($,Q),this.c.fromBufferAttribute($,Z),this}clone(){return new this.constructor().copy(this)}copy($){return this.a.copy($.a),this.b.copy($.b),this.c.copy($.c),this}getArea(){return y7.subVectors(this.c,this.b),W8.subVectors(this.a,this.b),y7.cross(W8).length()*0.5}getMidpoint($){return $.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal($){return x7.getNormal(this.a,this.b,this.c,$)}getPlane($){return $.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord($,J){return x7.getBarycoord($,this.a,this.b,this.c,J)}getInterpolation($,J,Q,Z,W){return x7.getInterpolation($,this.a,this.b,this.c,J,Q,Z,W)}containsPoint($){return x7.containsPoint($,this.a,this.b,this.c)}isFrontFacing($){return x7.isFrontFacing(this.a,this.b,this.c,$)}intersectsBox($){return $.intersectsTriangle(this)}closestPointToPoint($,J){let Q=this.a,Z=this.b,W=this.c,K,Y;x$.subVectors(Z,Q),b$.subVectors(W,Q),tQ.subVectors($,Q);let q=x$.dot(tQ),G=b$.dot(tQ);if(q<=0&&G<=0)return J.copy(Q);eQ.subVectors($,Z);let V=x$.dot(eQ),H=b$.dot(eQ);if(V>=0&&H<=V)return J.copy(Z);let N=q*H-V*G;if(N<=0&&q>=0&&V<=0)return K=q/(q-V),J.copy(Q).addScaledVector(x$,K);$1.subVectors($,W);let O=x$.dot($1),P=b$.dot($1);if(P>=0&&O<=P)return J.copy(W);let D=O*G-q*P;if(D<=0&&G>=0&&P<=0)return Y=G/(G-P),J.copy(Q).addScaledVector(b$,Y);let C=V*P-O*H;if(C<=0&&H-V>=0&&O-P>=0)return q4.subVectors(W,Z),Y=(H-V)/(H-V+(O-P)),J.copy(Z).addScaledVector(q4,Y);let z=1/(C+D+N);return K=D*z,Y=N*z,J.copy(Q).addScaledVector(x$,K).addScaledVector(b$,Y)}equals($){return $.a.equals(this.a)&&$.b.equals(this.b)&&$.c.equals(this.c)}}function W1($,J,Q){if(Q<0)Q+=1;if(Q>1)Q-=1;if(Q<0.16666666666666666)return $+(J-$)*6*Q;if(Q<0.5)return J;if(Q<0.6666666666666666)return $+(J-$)*6*(0.6666666666666666-Q);return $}function wX(){let $=new ArrayBuffer(4),J=new Float32Array($),Q=new Uint32Array($),Z=new Uint32Array(512),W=new Uint32Array(512);for(let G=0;G<256;++G){let V=G-127;if(V<-27)Z[G]=0,Z[G|256]=32768,W[G]=24,W[G|256]=24;else if(V<-14)Z[G]=1024>>-V-14,Z[G|256]=1024>>-V-14|32768,W[G]=-V-1,W[G|256]=-V-1;else if(V<=15)Z[G]=V+15<<10,Z[G|256]=V+15<<10|32768,W[G]=13,W[G|256]=13;else if(V<128)Z[G]=31744,Z[G|256]=64512,W[G]=24,W[G|256]=24;else Z[G]=31744,Z[G|256]=64512,W[G]=13,W[G|256]=13}let K=new Uint32Array(2048),Y=new Uint32Array(64),q=new Uint32Array(64);for(let G=1;G<1024;++G){let V=G<<13,H=0;while((V&8388608)===0)V<<=1,H-=8388608;V&=-8388609,H+=947912704,K[G]=V|H}for(let G=1024;G<2048;++G)K[G]=939524096+(G-1024<<13);for(let G=1;G<31;++G)Y[G]=G<<23;Y[31]=1199570944,Y[32]=2147483648;for(let G=33;G<63;++G)Y[G]=2147483648+(G-32<<23);Y[63]=3347054592;for(let G=1;G<64;++G)if(G!==32)q[G]=1024;return{floatView:J,uint32View:Q,baseTable:Z,shiftTable:W,mantissaTable:K,exponentTable:Y,offsetTable:q}}function MX($){if(Math.abs($)>65504)console.warn("THREE.DataUtils.toHalfFloat(): Value out of range.");$=G6($,-65504,65504),Y8.floatView[0]=$;let J=Y8.uint32View[0],Q=J>>23&511;return Y8.baseTable[Q]+((J&8388607)>>Y8.shiftTable[Q])}function TX($){let J=$>>10;return Y8.uint32View[0]=Y8.mantissaTable[Y8.offsetTable[J]+($&1023)]+Y8.exponentTable[J],Y8.floatView[0]}class XK{static toHalfFloat($){return MX($)}static fromHalfFloat($){return TX($)}}class L7{constructor($,J,Q=!1){if(Array.isArray($))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:kX++}),this.name="",this.array=$,this.itemSize=J,this.count=$!==void 0?$.length/J:0,this.normalized=Q,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate($){if($===!0)this.version++}setUsage($){return this.usage=$,this}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}copy($){return this.name=$.name,this.array=new $.array.constructor($.array),this.itemSize=$.itemSize,this.count=$.count,this.normalized=$.normalized,this.usage=$.usage,this.gpuType=$.gpuType,this}copyAt($,J,Q){$*=this.itemSize,Q*=J.itemSize;for(let Z=0,W=this.itemSize;Z<W;Z++)this.array[$+Z]=J.array[Q+Z];return this}copyArray($){return this.array.set($),this}applyMatrix3($){if(this.itemSize===2)for(let J=0,Q=this.count;J<Q;J++)$J.fromBufferAttribute(this,J),$J.applyMatrix3($),this.setXY(J,$J.x,$J.y);else if(this.itemSize===3)for(let J=0,Q=this.count;J<Q;J++)m6.fromBufferAttribute(this,J),m6.applyMatrix3($),this.setXYZ(J,m6.x,m6.y,m6.z);return this}applyMatrix4($){for(let J=0,Q=this.count;J<Q;J++)m6.fromBufferAttribute(this,J),m6.applyMatrix4($),this.setXYZ(J,m6.x,m6.y,m6.z);return this}applyNormalMatrix($){for(let J=0,Q=this.count;J<Q;J++)m6.fromBufferAttribute(this,J),m6.applyNormalMatrix($),this.setXYZ(J,m6.x,m6.y,m6.z);return this}transformDirection($){for(let J=0,Q=this.count;J<Q;J++)m6.fromBufferAttribute(this,J),m6.transformDirection($),this.setXYZ(J,m6.x,m6.y,m6.z);return this}set($,J=0){return this.array.set($,J),this}getComponent($,J){let Q=this.array[$*this.itemSize+J];if(this.normalized)Q=h7(Q,this.array);return Q}setComponent($,J,Q){if(this.normalized)Q=M6(Q,this.array);return this.array[$*this.itemSize+J]=Q,this}getX($){let J=this.array[$*this.itemSize];if(this.normalized)J=h7(J,this.array);return J}setX($,J){if(this.normalized)J=M6(J,this.array);return this.array[$*this.itemSize]=J,this}getY($){let J=this.array[$*this.itemSize+1];if(this.normalized)J=h7(J,this.array);return J}setY($,J){if(this.normalized)J=M6(J,this.array);return this.array[$*this.itemSize+1]=J,this}getZ($){let J=this.array[$*this.itemSize+2];if(this.normalized)J=h7(J,this.array);return J}setZ($,J){if(this.normalized)J=M6(J,this.array);return this.array[$*this.itemSize+2]=J,this}getW($){let J=this.array[$*this.itemSize+3];if(this.normalized)J=h7(J,this.array);return J}setW($,J){if(this.normalized)J=M6(J,this.array);return this.array[$*this.itemSize+3]=J,this}setXY($,J,Q){if($*=this.itemSize,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this}setXYZ($,J,Q,Z){if($*=this.itemSize,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array),Z=M6(Z,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this.array[$+2]=Z,this}setXYZW($,J,Q,Z,W){if($*=this.itemSize,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array),Z=M6(Z,this.array),W=M6(W,this.array);return this.array[$+0]=J,this.array[$+1]=Q,this.array[$+2]=Z,this.array[$+3]=W,this}onUpload($){return this.onUploadCallback=$,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let $={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")$.name=this.name;if(this.usage!==35044)$.usage=this.usage;return $}}function _X($,J,Q,Z,W,K,Y,q){let G;if(J.side===1)G=Z.intersectTriangle(Y,K,W,!0,q);else G=Z.intersectTriangle(W,K,Y,J.side===0,q);if(G===null)return null;UJ.copy(q),UJ.applyMatrix4($.matrixWorld);let V=Q.ray.origin.distanceTo(UJ);if(V<Q.near||V>Q.far)return null;return{distance:V,point:UJ.clone(),object:$}}function YJ($,J,Q,Z,W,K,Y,q,G,V){$.getVertexPosition(q,QJ),$.getVertexPosition(G,ZJ),$.getVertexPosition(V,WJ);let H=_X($,J,Q,Z,QJ,ZJ,WJ,V4);if(H){let N=new d;if(x7.getBarycoord(V4,QJ,ZJ,WJ,N),W)H.uv=x7.getInterpolatedAttribute(W,q,G,V,N,new V6);if(K)H.uv1=x7.getInterpolatedAttribute(K,q,G,V,N,new V6);if(Y){if(H.normal=x7.getInterpolatedAttribute(Y,q,G,V,N,new d),H.normal.dot(Z.direction)>0)H.normal.multiplyScalar(-1)}let O={a:q,b:G,c:V,normal:new d,materialIndex:0};x7.getNormal(QJ,ZJ,WJ,O.normal),H.face=O,H.barycoord=N}return H}function s$($){let J={};for(let Q in $){J[Q]={};for(let Z in $[Q]){let W=$[Q][Z];if(W&&(W.isColor||W.isMatrix3||W.isMatrix4||W.isVector2||W.isVector3||W.isVector4||W.isTexture||W.isQuaternion))if(W.isRenderTargetTexture)console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),J[Q][Z]=null;else J[Q][Z]=W.clone();else if(Array.isArray(W))J[Q][Z]=W.slice();else J[Q][Z]=W}}return J}function V7($){let J={};for(let Q=0;Q<$.length;Q++){let Z=s$($[Q]);for(let W in Z)J[W]=Z[W]}return J}function yX($){let J=[];for(let Q=0;Q<$.length;Q++)J.push($[Q].clone());return J}function GK($){let J=$.getRenderTarget();if(J===null)return $.outputColorSpace;if(J.isXRRenderTarget===!0)return J.texture.colorSpace;return I6.workingColorSpace}class IJ{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new d$,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new d$,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new d,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new d;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new d$,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new d,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new d;return this._grip}dispatchEvent($){if(this._targetRay!==null)this._targetRay.dispatchEvent($);if(this._grip!==null)this._grip.dispatchEvent($);if(this._hand!==null)this._hand.dispatchEvent($);return this}connect($){if($&&$.hand){let J=this._hand;if(J)for(let Q of $.hand.values())this._getHandJoint(J,Q)}return this.dispatchEvent({type:"connected",data:$}),this}disconnect($){if(this.dispatchEvent({type:"disconnected",data:$}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update($,J,Q){let Z=null,W=null,K=null,Y=this._targetRay,q=this._grip,G=this._hand;if($&&J.session.visibilityState!=="visible-blurred"){if(G&&$.hand){K=!0;for(let D of $.hand.values()){let C=J.getJointPose(D,Q),z=this._getHandJoint(G,D);if(C!==null)z.matrix.fromArray(C.transform.matrix),z.matrix.decompose(z.position,z.rotation,z.scale),z.matrixWorldNeedsUpdate=!0,z.jointRadius=C.radius;z.visible=C!==null}let V=G.joints["index-finger-tip"],H=G.joints["thumb-tip"],N=V.position.distanceTo(H.position),O=0.02,P=0.005;if(G.inputState.pinching&&N>O+P)G.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:$.handedness,target:this});else if(!G.inputState.pinching&&N<=O-P)G.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:$.handedness,target:this})}else if(q!==null&&$.gripSpace){if(W=J.getPose($.gripSpace,Q),W!==null){if(q.matrix.fromArray(W.transform.matrix),q.matrix.decompose(q.position,q.rotation,q.scale),q.matrixWorldNeedsUpdate=!0,W.linearVelocity)q.hasLinearVelocity=!0,q.linearVelocity.copy(W.linearVelocity);else q.hasLinearVelocity=!1;if(W.angularVelocity)q.hasAngularVelocity=!0,q.angularVelocity.copy(W.angularVelocity);else q.hasAngularVelocity=!1}}if(Y!==null){if(Z=J.getPose($.targetRaySpace,Q),Z===null&&W!==null)Z=W;if(Z!==null){if(Y.matrix.fromArray(Z.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,Z.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(Z.linearVelocity);else Y.hasLinearVelocity=!1;if(Z.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(Z.angularVelocity);else Y.hasAngularVelocity=!1;this.dispatchEvent(fX)}}}if(Y!==null)Y.visible=Z!==null;if(q!==null)q.visible=W!==null;if(G!==null)G.visible=K!==null;return this}_getHandJoint($,J){if($.joints[J.jointName]===void 0){let Q=new d$;Q.matrixAutoUpdate=!1,Q.visible=!1,$.joints[J.jointName]=Q,$.add(Q)}return $.joints[J.jointName]}}class k1{constructor($,J=1,Q=1000){this.isFog=!0,this.name="",this.color=new U6($),this.near=J,this.far=Q}clone(){return new k1(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class NK{constructor($,J){this.isInterleavedBuffer=!0,this.array=$,this.stride=J,this.count=$!==void 0?$.length/J:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=b7()}onUploadCallback(){}set needsUpdate($){if($===!0)this.version++}setUsage($){return this.usage=$,this}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}copy($){return this.array=new $.array.constructor($.array),this.count=$.count,this.stride=$.stride,this.usage=$.usage,this}copyAt($,J,Q){$*=this.stride,Q*=J.stride;for(let Z=0,W=this.stride;Z<W;Z++)this.array[$+Z]=J.array[Q+Z];return this}set($,J=0){return this.array.set($,J),this}clone($){if($.arrayBuffers===void 0)$.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=b7();if($.arrayBuffers[this.array.buffer._uuid]===void 0)$.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let J=new this.array.constructor($.arrayBuffers[this.array.buffer._uuid]),Q=new this.constructor(J,this.stride);return Q.setUsage(this.usage),Q}onUpload($){return this.onUploadCallback=$,this}toJSON($){if($.arrayBuffers===void 0)$.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=b7();if($.arrayBuffers[this.array.buffer._uuid]===void 0)$.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}class v1{constructor($,J,Q,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=$,this.itemSize=J,this.offset=Q,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate($){this.data.needsUpdate=$}applyMatrix4($){for(let J=0,Q=this.data.count;J<Q;J++)G7.fromBufferAttribute(this,J),G7.applyMatrix4($),this.setXYZ(J,G7.x,G7.y,G7.z);return this}applyNormalMatrix($){for(let J=0,Q=this.count;J<Q;J++)G7.fromBufferAttribute(this,J),G7.applyNormalMatrix($),this.setXYZ(J,G7.x,G7.y,G7.z);return this}transformDirection($){for(let J=0,Q=this.count;J<Q;J++)G7.fromBufferAttribute(this,J),G7.transformDirection($),this.setXYZ(J,G7.x,G7.y,G7.z);return this}getComponent($,J){let Q=this.array[$*this.data.stride+this.offset+J];if(this.normalized)Q=h7(Q,this.array);return Q}setComponent($,J,Q){if(this.normalized)Q=M6(Q,this.array);return this.data.array[$*this.data.stride+this.offset+J]=Q,this}setX($,J){if(this.normalized)J=M6(J,this.array);return this.data.array[$*this.data.stride+this.offset]=J,this}setY($,J){if(this.normalized)J=M6(J,this.array);return this.data.array[$*this.data.stride+this.offset+1]=J,this}setZ($,J){if(this.normalized)J=M6(J,this.array);return this.data.array[$*this.data.stride+this.offset+2]=J,this}setW($,J){if(this.normalized)J=M6(J,this.array);return this.data.array[$*this.data.stride+this.offset+3]=J,this}getX($){let J=this.data.array[$*this.data.stride+this.offset];if(this.normalized)J=h7(J,this.array);return J}getY($){let J=this.data.array[$*this.data.stride+this.offset+1];if(this.normalized)J=h7(J,this.array);return J}getZ($){let J=this.data.array[$*this.data.stride+this.offset+2];if(this.normalized)J=h7(J,this.array);return J}getW($){let J=this.data.array[$*this.data.stride+this.offset+3];if(this.normalized)J=h7(J,this.array);return J}setXY($,J,Q){if($=$*this.data.stride+this.offset,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this}setXYZ($,J,Q,Z){if($=$*this.data.stride+this.offset,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array),Z=M6(Z,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this.data.array[$+2]=Z,this}setXYZW($,J,Q,Z,W){if($=$*this.data.stride+this.offset,this.normalized)J=M6(J,this.array),Q=M6(Q,this.array),Z=M6(Z,this.array),W=M6(W,this.array);return this.data.array[$+0]=J,this.data.array[$+1]=Q,this.data.array[$+2]=Z,this.data.array[$+3]=W,this}clone($){if($===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let J=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)J.push(this.data.array[Z+W])}return new L7(new this.array.constructor(J),this.itemSize,this.normalized)}else{if($.interleavedBuffers===void 0)$.interleavedBuffers={};if($.interleavedBuffers[this.data.uuid]===void 0)$.interleavedBuffers[this.data.uuid]=this.data.clone($);return new v1($.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON($){if($===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let J=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)J.push(this.data.array[Z+W])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:J,normalized:this.normalized}}else{if($.interleavedBuffers===void 0)$.interleavedBuffers={};if($.interleavedBuffers[this.data.uuid]===void 0)$.interleavedBuffers[this.data.uuid]=this.data.toJSON($);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}class y1{constructor($=[],J=[]){this.uuid=b7(),this.bones=$.slice(0),this.boneInverses=J,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let $=this.bones,J=this.boneInverses;if(this.boneMatrices=new Float32Array($.length*16),J.length===0)this.calculateInverses();else if($.length!==J.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let Q=0,Z=this.bones.length;Q<Z;Q++)this.boneInverses.push(new q6)}}calculateInverses(){this.boneInverses.length=0;for(let $=0,J=this.bones.length;$<J;$++){let Q=new q6;if(this.bones[$])Q.copy(this.bones[$].matrixWorld).invert();this.boneInverses.push(Q)}}pose(){for(let $=0,J=this.bones.length;$<J;$++){let Q=this.bones[$];if(Q)Q.matrixWorld.copy(this.boneInverses[$]).invert()}for(let $=0,J=this.bones.length;$<J;$++){let Q=this.bones[$];if(Q){if(Q.parent&&Q.parent.isBone)Q.matrix.copy(Q.parent.matrixWorld).invert(),Q.matrix.multiply(Q.matrixWorld);else Q.matrix.copy(Q.matrixWorld);Q.matrix.decompose(Q.position,Q.quaternion,Q.scale)}}}update(){let $=this.bones,J=this.boneInverses,Q=this.boneMatrices,Z=this.boneTexture;for(let W=0,K=$.length;W<K;W++){let Y=$[W]?$[W].matrixWorld:pX;z4.multiplyMatrices(Y,J[W]),z4.toArray(Q,W*16)}if(Z!==null)Z.needsUpdate=!0}clone(){return new y1(this.bones,this.boneInverses)}computeBoneTexture(){let $=Math.sqrt(this.bones.length*4);$=Math.ceil($/4)*4,$=Math.max($,4);let J=new Float32Array($*$*4);J.set(this.boneMatrices);let Q=new s5(J,$,$,1023,1015);return Q.needsUpdate=!0,this.boneMatrices=J,this.boneTexture=Q,this}getBoneByName($){for(let J=0,Q=this.bones.length;J<Q;J++){let Z=this.bones[J];if(Z.name===$)return Z}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON($,J){this.uuid=$.uuid;for(let Q=0,Z=$.bones.length;Q<Z;Q++){let W=$.bones[Q],K=J[W];if(K===void 0)console.warn("THREE.Skeleton: No bone found with UUID:",W),K=new _1;this.bones.push(K),this.boneInverses.push(new q6().fromArray($.boneInverses[Q]))}return this.init(),this}toJSON(){let $={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};$.uuid=this.uuid;let J=this.bones,Q=this.boneInverses;for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z];$.bones.push(K.uuid);let Y=Q[Z];$.boneInverses.push(Y.toArray())}return $}}class v8{constructor($=new d(1,0,0),J=0){this.isPlane=!0,this.normal=$,this.constant=J}set($,J){return this.normal.copy($),this.constant=J,this}setComponents($,J,Q,Z){return this.normal.set($,J,Q),this.constant=Z,this}setFromNormalAndCoplanarPoint($,J){return this.normal.copy($),this.constant=-J.dot(this.normal),this}setFromCoplanarPoints($,J,Q){let Z=X1.subVectors(Q,J).cross(lX.subVectors($,J)).normalize();return this.setFromNormalAndCoplanarPoint(Z,$),this}copy($){return this.normal.copy($.normal),this.constant=$.constant,this}normalize(){let $=1/this.normal.length();return this.normal.multiplyScalar($),this.constant*=$,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint($){return this.normal.dot($)+this.constant}distanceToSphere($){return this.distanceToPoint($.center)-$.radius}projectPoint($,J){return J.copy($).addScaledVector(this.normal,-this.distanceToPoint($))}intersectLine($,J){let Q=$.delta(X1),Z=this.normal.dot(Q);if(Z===0){if(this.distanceToPoint($.start)===0)return J.copy($.start);return null}let W=-($.start.dot(this.normal)+this.constant)/Z;if(W<0||W>1)return null;return J.copy($.start).addScaledVector(Q,W)}intersectsLine($){let J=this.distanceToPoint($.start),Q=this.distanceToPoint($.end);return J<0&&Q>0||Q<0&&J>0}intersectsBox($){return $.intersectsPlane(this)}intersectsSphere($){return $.intersectsPlane(this)}coplanarPoint($){return $.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4($,J){let Q=J||mX.getNormalMatrix($),Z=this.coplanarPoint(X1).applyMatrix4($),W=this.normal.applyMatrix3(Q).normalize();return this.constant=-Z.dot(W),this}translate($){return this.constant-=$.dot(this.normal),this}equals($){return $.normal.equals(this.normal)&&$.constant===this.constant}clone(){return new this.constructor().copy(this)}}class wJ{constructor($=new v8,J=new v8,Q=new v8,Z=new v8,W=new v8,K=new v8){this.planes=[$,J,Q,Z,W,K]}set($,J,Q,Z,W,K){let Y=this.planes;return Y[0].copy($),Y[1].copy(J),Y[2].copy(Q),Y[3].copy(Z),Y[4].copy(W),Y[5].copy(K),this}copy($){let J=this.planes;for(let Q=0;Q<6;Q++)J[Q].copy($.planes[Q]);return this}setFromProjectionMatrix($,J=2000,Q=!1){let Z=this.planes,W=$.elements,K=W[0],Y=W[1],q=W[2],G=W[3],V=W[4],H=W[5],N=W[6],O=W[7],P=W[8],D=W[9],C=W[10],z=W[11],L=W[12],T=W[13],R=W[14],v=W[15];if(Z[0].setComponents(G-K,O-V,z-P,v-L).normalize(),Z[1].setComponents(G+K,O+V,z+P,v+L).normalize(),Z[2].setComponents(G+Y,O+H,z+D,v+T).normalize(),Z[3].setComponents(G-Y,O-H,z-D,v-T).normalize(),Q)Z[4].setComponents(q,N,C,R).normalize(),Z[5].setComponents(G-q,O-N,z-C,v-R).normalize();else if(Z[4].setComponents(G-q,O-N,z-C,v-R).normalize(),J===2000)Z[5].setComponents(G+q,O+N,z+C,v+R).normalize();else if(J===2001)Z[5].setComponents(q,N,C,R).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+J);return this}intersectsObject($){if($.boundingSphere!==void 0){if($.boundingSphere===null)$.computeBoundingSphere();W$.copy($.boundingSphere).applyMatrix4($.matrixWorld)}else{let J=$.geometry;if(J.boundingSphere===null)J.computeBoundingSphere();W$.copy(J.boundingSphere).applyMatrix4($.matrixWorld)}return this.intersectsSphere(W$)}intersectsSprite($){W$.center.set(0,0,0);let J=dX.distanceTo($.center);return W$.radius=0.7071067811865476+J,W$.applyMatrix4($.matrixWorld),this.intersectsSphere(W$)}intersectsSphere($){let J=this.planes,Q=$.center,Z=-$.radius;for(let W=0;W<6;W++)if(J[W].distanceToPoint(Q)<Z)return!1;return!0}intersectsBox($){let J=this.planes;for(let Q=0;Q<6;Q++){let Z=J[Q];if(GJ.x=Z.normal.x>0?$.max.x:$.min.x,GJ.y=Z.normal.y>0?$.max.y:$.min.y,GJ.z=Z.normal.z>0?$.max.z:$.min.z,Z.distanceToPoint(GJ)<0)return!1}return!0}containsPoint($){let J=this.planes;for(let Q=0;Q<6;Q++)if(J[Q].distanceToPoint($)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function BJ($,J,Q,Z,W,K,Y){let q=$.geometry.attributes.position;if(CJ.fromBufferAttribute(q,W),RJ.fromBufferAttribute(q,K),Q.distanceSqToSegment(CJ,RJ,G1,R4)>Z)return;G1.applyMatrix4($.matrixWorld);let V=J.ray.origin.distanceTo(G1);if(V<J.near||V>J.far)return;return{distance:V,point:R4.clone().applyMatrix4($.matrixWorld),index:Y,face:null,faceIndex:null,barycoord:null,object:$}}function j4($,J,Q,Z,W,K,Y){let q=D1.distanceSqToPoint($);if(q<Q){let G=new d;D1.closestPointToPoint($,G),G.applyMatrix4(Z);let V=W.ray.origin.distanceTo(G);if(V<W.near||V>W.far)return;K.push({distance:V,distanceToRay:Math.sqrt(q),point:G,index:J,face:null,faceIndex:null,barycoord:null,object:Y})}}function FJ($,J){if(!$||$.constructor===J)return $;if(typeof J.BYTES_PER_ELEMENT==="number")return new J($);return Array.prototype.slice.call($)}function cX($){return ArrayBuffer.isView($)&&!($ instanceof DataView)}function nX($){function J(W,K){return $[W]-$[K]}let Q=$.length,Z=Array(Q);for(let W=0;W!==Q;++W)Z[W]=W;return Z.sort(J),Z}function w4($,J,Q){let Z=$.length,W=new $.constructor(Z);for(let K=0,Y=0;Y!==Z;++K){let q=Q[K]*J;for(let G=0;G!==J;++G)W[Y++]=$[q+G]}return W}function RK($,J,Q,Z){let W=1,K=$[0];while(K!==void 0&&K[Z]===void 0)K=$[W++];if(K===void 0)return;let Y=K[Z];if(Y===void 0)return;if(Array.isArray(Y))do{if(Y=K[Z],Y!==void 0)J.push(K.time),Q.push(...Y);K=$[W++]}while(K!==void 0);else if(Y.toArray!==void 0)do{if(Y=K[Z],Y!==void 0)J.push(K.time),Y.toArray(Q,Q.length);K=$[W++]}while(K!==void 0);else do{if(Y=K[Z],Y!==void 0)J.push(K.time),Q.push(Y);K=$[W++]}while(K!==void 0)}class e${constructor($,J,Q,Z){this.parameterPositions=$,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new J.constructor(Q),this.sampleValues=J,this.valueSize=Q,this.settings=null,this.DefaultSettings_={}}evaluate($){let J=this.parameterPositions,Q=this._cachedIndex,Z=J[Q],W=J[Q-1];$:{J:{let K;Q:{Z:if(!($<Z)){for(let Y=Q+2;;){if(Z===void 0){if($<W)break Z;return Q=J.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}if(Q===Y)break;if(W=Z,Z=J[++Q],$<Z)break J}K=J.length;break Q}if(!($>=W)){let Y=J[1];if($<Y)Q=2,W=Y;for(let q=Q-2;;){if(W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Q===q)break;if(Z=W,W=J[--Q-1],$>=W)break J}K=Q,Q=0;break Q}break $}while(Q<K){let Y=Q+K>>>1;if($<J[Y])K=Y;else Q=Y+1}if(Z=J[Q],W=J[Q-1],W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return Q=J.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}this._cachedIndex=Q,this.intervalChanged_(Q,W,Z)}return this.interpolate_(Q,W,$,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_($){let J=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,W=$*Z;for(let K=0;K!==Z;++K)J[K]=Q[W+K];return J}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class A7{constructor($,J,Q,Z){if($===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(J===void 0||J.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+$);this.name=$,this.times=FJ(J,this.TimeBufferType),this.values=FJ(Q,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON($){let J=$.constructor,Q;if(J.toJSON!==this.toJSON)Q=J.toJSON($);else{Q={name:$.name,times:FJ($.times,Array),values:FJ($.values,Array)};let Z=$.getInterpolation();if(Z!==$.DefaultInterpolation)Q.interpolation=Z}return Q.type=$.ValueTypeName,Q}InterpolantFactoryMethodDiscrete($){return new SK(this.times,this.values,this.getValueSize(),$)}InterpolantFactoryMethodLinear($){return new c1(this.times,this.values,this.getValueSize(),$)}InterpolantFactoryMethodSmooth($){return new EK(this.times,this.values,this.getValueSize(),$)}setInterpolation($){let J;switch($){case 2300:J=this.InterpolantFactoryMethodDiscrete;break;case 2301:J=this.InterpolantFactoryMethodLinear;break;case 2302:J=this.InterpolantFactoryMethodSmooth;break}if(J===void 0){let Q="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if($!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(Q);return console.warn("THREE.KeyframeTrack:",Q),this}return this.createInterpolant=J,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302}}getValueSize(){return this.values.length/this.times.length}shift($){if($!==0){let J=this.times;for(let Q=0,Z=J.length;Q!==Z;++Q)J[Q]+=$}return this}scale($){if($!==1){let J=this.times;for(let Q=0,Z=J.length;Q!==Z;++Q)J[Q]*=$}return this}trim($,J){let Q=this.times,Z=Q.length,W=0,K=Z-1;while(W!==Z&&Q[W]<$)++W;while(K!==-1&&Q[K]>J)--K;if(++K,W!==0||K!==Z){if(W>=K)K=Math.max(K,1),W=K-1;let Y=this.getValueSize();this.times=Q.slice(W,K),this.values=this.values.slice(W*Y,K*Y)}return this}validate(){let $=!0,J=this.getValueSize();if(J-Math.floor(J)!==0)console.error("THREE.KeyframeTrack: Invalid value size in track.",this),$=!1;let Q=this.times,Z=this.values,W=Q.length;if(W===0)console.error("THREE.KeyframeTrack: Track is empty.",this),$=!1;let K=null;for(let Y=0;Y!==W;Y++){let q=Q[Y];if(typeof q==="number"&&isNaN(q)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,Y,q),$=!1;break}if(K!==null&&K>q){console.error("THREE.KeyframeTrack: Out of order keys.",this,Y,q,K),$=!1;break}K=q}if(Z!==void 0){if(cX(Z))for(let Y=0,q=Z.length;Y!==q;++Y){let G=Z[Y];if(isNaN(G)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,Y,G),$=!1;break}}}return $}optimize(){let $=this.times.slice(),J=this.values.slice(),Q=this.getValueSize(),Z=this.getInterpolation()===2302,W=$.length-1,K=1;for(let Y=1;Y<W;++Y){let q=!1,G=$[Y],V=$[Y+1];if(G!==V&&(Y!==1||G!==$[0]))if(!Z){let H=Y*Q,N=H-Q,O=H+Q;for(let P=0;P!==Q;++P){let D=J[H+P];if(D!==J[N+P]||D!==J[O+P]){q=!0;break}}}else q=!0;if(q){if(Y!==K){$[K]=$[Y];let H=Y*Q,N=K*Q;for(let O=0;O!==Q;++O)J[N+O]=J[H+O]}++K}}if(W>0){$[K]=$[W];for(let Y=W*Q,q=K*Q,G=0;G!==Q;++G)J[q+G]=J[Y+G];++K}if(K!==$.length)this.times=$.slice(0,K),this.values=J.slice(0,K*Q);else this.times=$,this.values=J;return this}clone(){let $=this.times.slice(),J=this.values.slice(),Z=new this.constructor(this.name,$,J);return Z.createInterpolant=this.createInterpolant,Z}}class EJ{constructor($="",J=-1,Q=[],Z=2500){if(this.name=$,this.tracks=Q,this.duration=J,this.blendMode=Z,this.uuid=b7(),this.userData={},this.duration<0)this.resetDuration()}static parse($){let J=[],Q=$.tracks,Z=1/($.fps||1);for(let K=0,Y=Q.length;K!==Y;++K)J.push(sX(Q[K]).scale(Z));let W=new this($.name,$.duration,J,$.blendMode);return W.uuid=$.uuid,W.userData=JSON.parse($.userData||"{}"),W}static toJSON($){let J=[],Q=$.tracks,Z={name:$.name,duration:$.duration,tracks:J,uuid:$.uuid,blendMode:$.blendMode,userData:JSON.stringify($.userData)};for(let W=0,K=Q.length;W!==K;++W)J.push(A7.toJSON(Q[W]));return Z}static CreateFromMorphTargetSequence($,J,Q,Z){let W=J.length,K=[];for(let Y=0;Y<W;Y++){let q=[],G=[];q.push((Y+W-1)%W,Y,(Y+1)%W),G.push(0,1,0);let V=nX(q);if(q=w4(q,1,V),G=w4(G,1,V),!Z&&q[0]===0)q.push(W),G.push(G[0]);K.push(new o$(".morphTargetInfluences["+J[Y].name+"]",q,G).scale(1/Q))}return new this($,-1,K)}static findByName($,J){let Q=$;if(!Array.isArray($)){let Z=$;Q=Z.geometry&&Z.geometry.animations||Z.animations}for(let Z=0;Z<Q.length;Z++)if(Q[Z].name===J)return Q[Z];return null}static CreateClipsFromMorphTargetSequences($,J,Q){let Z={},W=/^([\w-]*?)([\d]+)$/;for(let Y=0,q=$.length;Y<q;Y++){let G=$[Y],V=G.name.match(W);if(V&&V.length>1){let H=V[1],N=Z[H];if(!N)Z[H]=N=[];N.push(G)}}let K=[];for(let Y in Z)K.push(this.CreateFromMorphTargetSequence(Y,Z[Y],J,Q));return K}static parseAnimation($,J){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!$)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;let Q=function(H,N,O,P,D){if(O.length!==0){let C=[],z=[];if(RK(O,C,z,P),C.length!==0)D.push(new H(N,C,z))}},Z=[],W=$.name||"default",K=$.fps||30,Y=$.blendMode,q=$.length||-1,G=$.hierarchy||[];for(let H=0;H<G.length;H++){let N=G[H].keys;if(!N||N.length===0)continue;if(N[0].morphTargets){let O={},P;for(P=0;P<N.length;P++)if(N[P].morphTargets)for(let D=0;D<N[P].morphTargets.length;D++)O[N[P].morphTargets[D]]=-1;for(let D in O){let C=[],z=[];for(let L=0;L!==N[P].morphTargets.length;++L){let T=N[P];C.push(T.time),z.push(T.morphTarget===D?1:0)}Z.push(new o$(".morphTargetInfluence["+D+"]",C,z))}q=O.length*K}else{let O=".bones["+J[H].name+"]";Q(a$,O+".position",N,"pos",Z),Q($5,O+".quaternion",N,"rot",Z),Q(a$,O+".scale",N,"scl",Z)}}if(Z.length===0)return null;return new this(W,q,Z,Y)}resetDuration(){let $=this.tracks,J=0;for(let Q=0,Z=$.length;Q!==Z;++Q){let W=this.tracks[Q];J=Math.max(J,W.times[W.times.length-1])}return this.duration=J,this}trim(){for(let $=0;$<this.tracks.length;$++)this.tracks[$].trim(0,this.duration);return this}validate(){let $=!0;for(let J=0;J<this.tracks.length;J++)$=$&&this.tracks[J].validate();return $}optimize(){for(let $=0;$<this.tracks.length;$++)this.tracks[$].optimize();return this}clone(){let $=[];for(let Q=0;Q<this.tracks.length;Q++)$.push(this.tracks[Q].clone());let J=new this.constructor(this.name,this.duration,$,this.blendMode);return J.userData=JSON.parse(JSON.stringify(this.userData)),J}toJSON(){return this.constructor.toJSON(this)}}function iX($){switch($.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return o$;case"vector":case"vector2":case"vector3":case"vector4":return a$;case"color":return n1;case"quaternion":return $5;case"bool":case"boolean":return X$;case"string":return G$}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+$)}function sX($){if($.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let J=iX($.type);if($.times===void 0){let Q=[],Z=[];RK($.keys,Q,Z,"value"),$.times=Q,$.values=Z}if(J.parse!==void 0)return J.parse($);else return new J($.name,$.times,$.values,$.interpolation)}class jK{constructor($,J,Q){let Z=this,W=!1,K=0,Y=0,q=void 0,G=[];this.onStart=void 0,this.onLoad=$,this.onProgress=J,this.onError=Q,this.abortController=new AbortController,this.itemStart=function(V){if(Y++,W===!1){if(Z.onStart!==void 0)Z.onStart(V,K,Y)}W=!0},this.itemEnd=function(V){if(K++,Z.onProgress!==void 0)Z.onProgress(V,K,Y);if(K===Y){if(W=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(V){if(Z.onError!==void 0)Z.onError(V)},this.resolveURL=function(V){if(q)return q(V);return V},this.setURLModifier=function(V){return q=V,this},this.addHandler=function(V,H){return G.push(V,H),this},this.removeHandler=function(V){let H=G.indexOf(V);if(H!==-1)G.splice(H,2);return this},this.getHandler=function(V){for(let H=0,N=G.length;H<N;H+=2){let O=G[H],P=G[H+1];if(O.global)O.lastIndex=0;if(O.test(V))return P}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}class y8{constructor($){this.manager=$!==void 0?$:oX,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync($,J){let Q=this;return new Promise(function(Z,W){Q.load($,Z,J,W)})}parse(){}setCrossOrigin($){return this.crossOrigin=$,this}setWithCredentials($){return this.withCredentials=$,this}setPath($){return this.path=$,this}setResourcePath($){return this.resourcePath=$,this}setRequestHeader($){return this.requestHeader=$,this}abort(){return this}}class _J{constructor($){this.camera=$,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new V6(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new q6,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new wJ,this._frameExtents=new V6(1,1),this._viewportCount=1,this._viewports=[new S6(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices($){let J=this.camera,Q=this.matrix;if(M4.setFromMatrixPosition($.matrixWorld),J.position.copy(M4),T4.setFromMatrixPosition($.target.matrixWorld),J.lookAt(T4),J.updateMatrixWorld(),V1.multiplyMatrices(J.projectionMatrix,J.matrixWorldInverse),this._frustum.setFromProjectionMatrix(V1,J.coordinateSystem,J.reversedDepth),J.reversedDepth)Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,1,0,0,0,0,1);else Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);Q.multiply(V1)}getViewport($){return this._viewports[$]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy($){return this.camera=$.camera.clone(),this.intensity=$.intensity,this.bias=$.bias,this.radius=$.radius,this.autoUpdate=$.autoUpdate,this.needsUpdate=$.needsUpdate,this.normalBias=$.normalBias,this.blurSamples=$.blurSamples,this.mapSize.copy($.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let $={};if(this.intensity!==1)$.intensity=this.intensity;if(this.bias!==0)$.bias=this.bias;if(this.normalBias!==0)$.normalBias=this.normalBias;if(this.radius!==1)$.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)$.mapSize=this.mapSize.toArray();return $.camera=this.camera.toJSON(!1).object,delete $.camera.matrix,$}}class gK{static extractUrlBase($){let J=$.lastIndexOf("/");if(J===-1)return"./";return $.slice(0,J+1)}static resolveURL($,J){if(typeof $!=="string"||$==="")return"";if(/^https?:\/\//i.test(J)&&/^\//.test($))J=J.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test($))return $;if(/^data:.*,.*$/i.test($))return $;if(/^blob:.*$/i.test($))return $;return J+$}}class lK{constructor($,J,Q){this.binding=$,this.valueSize=Q;let Z,W,K;switch(J){case"quaternion":Z=this._slerp,W=this._slerpAdditive,K=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(Q*6),this._workIndex=5;break;case"string":case"bool":Z=this._select,W=this._select,K=this._setAdditiveIdentityOther,this.buffer=Array(Q*5);break;default:Z=this._lerp,W=this._lerpAdditive,K=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(Q*5)}this._mixBufferRegion=Z,this._mixBufferRegionAdditive=W,this._setIdentity=K,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate($,J){let Q=this.buffer,Z=this.valueSize,W=$*Z+Z,K=this.cumulativeWeight;if(K===0){for(let Y=0;Y!==Z;++Y)Q[W+Y]=Q[Y];K=J}else{K+=J;let Y=J/K;this._mixBufferRegion(Q,W,0,Y,Z)}this.cumulativeWeight=K}accumulateAdditive($){let J=this.buffer,Q=this.valueSize,Z=Q*this._addIndex;if(this.cumulativeWeightAdditive===0)this._setIdentity();this._mixBufferRegionAdditive(J,Z,0,$,Q),this.cumulativeWeightAdditive+=$}apply($){let J=this.valueSize,Q=this.buffer,Z=$*J+J,W=this.cumulativeWeight,K=this.cumulativeWeightAdditive,Y=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,W<1){let q=J*this._origIndex;this._mixBufferRegion(Q,Z,q,1-W,J)}if(K>0)this._mixBufferRegionAdditive(Q,Z,this._addIndex*J,1,J);for(let q=J,G=J+J;q!==G;++q)if(Q[q]!==Q[q+J]){Y.setValue(Q,Z);break}}saveOriginalState(){let $=this.binding,J=this.buffer,Q=this.valueSize,Z=Q*this._origIndex;$.getValue(J,Z);for(let W=Q,K=Z;W!==K;++W)J[W]=J[Z+W%Q];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let $=this.valueSize*3;this.binding.setValue(this.buffer,$)}_setAdditiveIdentityNumeric(){let $=this._addIndex*this.valueSize,J=$+this.valueSize;for(let Q=$;Q<J;Q++)this.buffer[Q]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let $=this._origIndex*this.valueSize,J=this._addIndex*this.valueSize;for(let Q=0;Q<this.valueSize;Q++)this.buffer[J+Q]=this.buffer[$+Q]}_select($,J,Q,Z,W){if(Z>=0.5)for(let K=0;K!==W;++K)$[J+K]=$[Q+K]}_slerp($,J,Q,Z){f7.slerpFlat($,J,$,J,$,Q,Z)}_slerpAdditive($,J,Q,Z,W){let K=this._workIndex*W;f7.multiplyQuaternionsFlat($,K,$,J,$,Q),f7.slerpFlat($,J,$,J,$,K,Z)}_lerp($,J,Q,Z,W){let K=1-Z;for(let Y=0;Y!==W;++Y){let q=J+Y;$[q]=$[q]*K+$[Q+Y]*Z}}_lerpAdditive($,J,Q,Z,W){for(let K=0;K!==W;++K){let Y=J+K;$[Y]=$[Y]+$[Q+K]*Z}}}class mK{constructor($,J,Q){let Z=Q||j6.parseTrackName(J);this._targetGroup=$,this._bindings=$.subscribe_(J,Z)}getValue($,J){this.bind();let Q=this._targetGroup.nCachedObjects_,Z=this._bindings[Q];if(Z!==void 0)Z.getValue($,J)}setValue($,J){let Q=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,W=Q.length;Z!==W;++Z)Q[Z].setValue($,J)}bind(){let $=this._bindings;for(let J=this._targetGroup.nCachedObjects_,Q=$.length;J!==Q;++J)$[J].bind()}unbind(){let $=this._bindings;for(let J=this._targetGroup.nCachedObjects_,Q=$.length;J!==Q;++J)$[J].unbind()}}class j6{constructor($,J,Q){this.path=J,this.parsedPath=Q||j6.parseTrackName(J),this.node=j6.findNode($,this.parsedPath.nodeName),this.rootNode=$,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create($,J,Q){if(!($&&$.isAnimationObjectGroup))return new j6($,J,Q);else return new j6.Composite($,J,Q)}static sanitizeNodeName($){return $.replace(/\s/g,"_").replace(aX,"")}static parseTrackName($){let J=QG.exec($);if(J===null)throw Error("PropertyBinding: Cannot parse trackName: "+$);let Q={nodeName:J[2],objectName:J[3],objectIndex:J[4],propertyName:J[5],propertyIndex:J[6]},Z=Q.nodeName&&Q.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let W=Q.nodeName.substring(Z+1);if(ZG.indexOf(W)!==-1)Q.nodeName=Q.nodeName.substring(0,Z),Q.objectName=W}if(Q.propertyName===null||Q.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+$);return Q}static findNode($,J){if(J===void 0||J===""||J==="."||J===-1||J===$.name||J===$.uuid)return $;if($.skeleton){let Q=$.skeleton.getBoneByName(J);if(Q!==void 0)return Q}if($.children){let Q=function(W){for(let K=0;K<W.length;K++){let Y=W[K];if(Y.name===J||Y.uuid===J)return Y;let q=Q(Y.children);if(q)return q}return null},Z=Q($.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct($,J){$[J]=this.targetObject[this.propertyName]}_getValue_array($,J){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)$[J++]=Q[Z]}_getValue_arrayElement($,J){$[J]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray($,J){this.resolvedProperty.toArray($,J)}_setValue_direct($,J){this.targetObject[this.propertyName]=$[J]}_setValue_direct_setNeedsUpdate($,J){this.targetObject[this.propertyName]=$[J],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate($,J){this.targetObject[this.propertyName]=$[J],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array($,J){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=$[J++]}_setValue_array_setNeedsUpdate($,J){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=$[J++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate($,J){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=$[J++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement($,J){this.resolvedProperty[this.propertyIndex]=$[J]}_setValue_arrayElement_setNeedsUpdate($,J){this.resolvedProperty[this.propertyIndex]=$[J],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate($,J){this.resolvedProperty[this.propertyIndex]=$[J],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray($,J){this.resolvedProperty.fromArray($,J)}_setValue_fromArray_setNeedsUpdate($,J){this.resolvedProperty.fromArray($,J),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate($,J){this.resolvedProperty.fromArray($,J),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound($,J){this.bind(),this.getValue($,J)}_setValue_unbound($,J){this.bind(),this.setValue($,J)}bind(){let $=this.node,J=this.parsedPath,Q=J.objectName,Z=J.propertyName,W=J.propertyIndex;if(!$)$=j6.findNode(this.rootNode,J.nodeName),this.node=$;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!$){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(Q){let G=J.objectIndex;switch(Q){case"materials":if(!$.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!$.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}$=$.material.materials;break;case"bones":if(!$.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}$=$.skeleton.bones;for(let V=0;V<$.length;V++)if($[V].name===G){G=V;break}break;case"map":if("map"in $){$=$.map;break}if(!$.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!$.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}$=$.material.map;break;default:if($[Q]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}$=$[Q]}if(G!==void 0){if($[G]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,$);return}$=$[G]}}let K=$[Z];if(K===void 0){let G=J.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+G+"."+Z+" but it wasn't found.",$);return}let Y=this.Versioning.None;if(this.targetObject=$,$.isMaterial===!0)Y=this.Versioning.NeedsUpdate;else if($.isObject3D===!0)Y=this.Versioning.MatrixWorldNeedsUpdate;let q=this.BindingType.Direct;if(W!==void 0){if(Z==="morphTargetInfluences"){if(!$.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!$.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if($.morphTargetDictionary[W]!==void 0)W=$.morphTargetDictionary[W]}q=this.BindingType.ArrayElement,this.resolvedProperty=K,this.propertyIndex=W}else if(K.fromArray!==void 0&&K.toArray!==void 0)q=this.BindingType.HasFromToArray,this.resolvedProperty=K;else if(Array.isArray(K))q=this.BindingType.EntireArray,this.resolvedProperty=K;else this.propertyName=Z;this.getValue=this.GetterByBindingType[q],this.setValue=this.SetterByBindingTypeAndVersioning[q][Y]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}class dK{constructor($,J,Q=null,Z=J.blendMode){this._mixer=$,this._clip=J,this._localRoot=Q,this.blendMode=Z;let W=J.tracks,K=W.length,Y=Array(K),q={endingStart:2400,endingEnd:2400};for(let G=0;G!==K;++G){let V=W[G].createInterpolant(null);Y[G]=V,V.settings=q}this._interpolantSettings=q,this._interpolants=Y,this._propertyBindings=Array(K),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt($){return this._startTime=$,this}setLoop($,J){return this.loop=$,this.repetitions=J,this}setEffectiveWeight($){return this.weight=$,this._effectiveWeight=this.enabled?$:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn($){return this._scheduleFading($,0,1)}fadeOut($){return this._scheduleFading($,1,0)}crossFadeFrom($,J,Q=!1){if($.fadeOut(J),this.fadeIn(J),Q===!0){let Z=this._clip.duration,W=$._clip.duration,K=W/Z,Y=Z/W;$.warp(1,K,J),this.warp(Y,1,J)}return this}crossFadeTo($,J,Q=!1){return $.crossFadeFrom(this,J,Q)}stopFading(){let $=this._weightInterpolant;if($!==null)this._weightInterpolant=null,this._mixer._takeBackControlInterpolant($);return this}setEffectiveTimeScale($){return this.timeScale=$,this._effectiveTimeScale=this.paused?0:$,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration($){return this.timeScale=this._clip.duration/$,this.stopWarping()}syncWith($){return this.time=$.time,this.timeScale=$.timeScale,this.stopWarping()}halt($){return this.warp(this._effectiveTimeScale,0,$)}warp($,J,Q){let Z=this._mixer,W=Z.time,K=this.timeScale,Y=this._timeScaleInterpolant;if(Y===null)Y=Z._lendControlInterpolant(),this._timeScaleInterpolant=Y;let{parameterPositions:q,sampleValues:G}=Y;return q[0]=W,q[1]=W+Q,G[0]=$/K,G[1]=J/K,this}stopWarping(){let $=this._timeScaleInterpolant;if($!==null)this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant($);return this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update($,J,Q,Z){if(!this.enabled){this._updateWeight($);return}let W=this._startTime;if(W!==null){let q=($-W)*Q;if(q<0||Q===0)J=0;else this._startTime=null,J=Q*q}J*=this._updateTimeScale($);let K=this._updateTime(J),Y=this._updateWeight($);if(Y>0){let q=this._interpolants,G=this._propertyBindings;switch(this.blendMode){case 2501:for(let V=0,H=q.length;V!==H;++V)q[V].evaluate(K),G[V].accumulateAdditive(Y);break;case 2500:default:for(let V=0,H=q.length;V!==H;++V)q[V].evaluate(K),G[V].accumulate(Z,Y)}}}_updateWeight($){let J=0;if(this.enabled){J=this.weight;let Q=this._weightInterpolant;if(Q!==null){let Z=Q.evaluate($)[0];if(J*=Z,$>Q.parameterPositions[1]){if(this.stopFading(),Z===0)this.enabled=!1}}}return this._effectiveWeight=J,J}_updateTimeScale($){let J=0;if(!this.paused){J=this.timeScale;let Q=this._timeScaleInterpolant;if(Q!==null){let Z=Q.evaluate($)[0];if(J*=Z,$>Q.parameterPositions[1])if(this.stopWarping(),J===0)this.paused=!0;else this.timeScale=J}}return this._effectiveTimeScale=J,J}_updateTime($){let J=this._clip.duration,Q=this.loop,Z=this.time+$,W=this._loopCount,K=Q===2202;if($===0){if(W===-1)return Z;return K&&(W&1)===1?J-Z:Z}if(Q===2200){if(W===-1)this._loopCount=0,this._setEndings(!0,!0,!1);$:{if(Z>=J)Z=J;else if(Z<0)Z=0;else{this.time=Z;break $}if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:$<0?-1:1})}}else{if(W===-1)if($>=0)W=0,this._setEndings(!0,this.repetitions===0,K);else this._setEndings(this.repetitions===0,!0,K);if(Z>=J||Z<0){let Y=Math.floor(Z/J);Z-=J*Y,W+=Math.abs(Y);let q=this.repetitions-W;if(q<=0){if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;Z=$>0?J:0,this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:$>0?1:-1})}else{if(q===1){let G=$<0;this._setEndings(G,!G,K)}else this._setEndings(!1,!1,K);this._loopCount=W,this.time=Z,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:Y})}}else this.time=Z;if(K&&(W&1)===1)return J-Z}return Z}_setEndings($,J,Q){let Z=this._interpolantSettings;if(Q)Z.endingStart=2401,Z.endingEnd=2401;else{if($)Z.endingStart=this.zeroSlopeAtStart?2401:2400;else Z.endingStart=2402;if(J)Z.endingEnd=this.zeroSlopeAtEnd?2401:2400;else Z.endingEnd=2402}}_scheduleFading($,J,Q){let Z=this._mixer,W=Z.time,K=this._weightInterpolant;if(K===null)K=Z._lendControlInterpolant(),this._weightInterpolant=K;let{parameterPositions:Y,sampleValues:q}=K;return Y[0]=W,q[0]=J,Y[1]=W+$,q[1]=Q,this}}class nK{constructor($,J,Q=0,Z=1/0){this.ray=new r$($,J),this.near=Q,this.far=Z,this.camera=null,this.layers=new AJ,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set($,J){this.ray.set($,J)}setFromCamera($,J){if(J.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set($.x,$.y,0.5).unproject(J).sub(this.ray.origin).normalize(),this.camera=J;else if(J.isOrthographicCamera)this.ray.origin.set($.x,$.y,(J.near+J.far)/(J.near-J.far)).unproject(J),this.ray.direction.set(0,0,-1).transformDirection(J.matrixWorld),this.camera=J;else console.error("THREE.Raycaster: Unsupported camera type: "+J.type)}setFromXRController($){return v4.identity().extractRotation($.matrixWorld),this.ray.origin.setFromMatrixPosition($.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(v4),this}intersectObject($,J=!0,Q=[]){return C1($,this,Q,J),Q.sort(_4),Q}intersectObjects($,J=!0,Q=[]){for(let Z=0,W=$.length;Z<W;Z++)C1($[Z],this,Q,J);return Q.sort(_4),Q}}function _4($,J){return $.distance-J.distance}function C1($,J,Q,Z){let W=!0;if($.layers.test(J.layers)){if($.raycast(J,Q)===!1)W=!1}if(W===!0&&Z===!0){let K=$.children;for(let Y=0,q=K.length;Y<q;Y++)C1(K[Y],J,Q,!0)}}function sK($){let J=[];if($.isBone===!0)J.push($);for(let Q=0;Q<$.children.length;Q++)J.push(...sK($.children[Q]));return J}function y4($,J,Q,Z){let W=KG(Z);switch(Q){case 1021:return $*J;case 1028:return $*J/W.components*W.byteLength;case 1029:return $*J/W.components*W.byteLength;case 1030:return $*J*2/W.components*W.byteLength;case 1031:return $*J*2/W.components*W.byteLength;case 1022:return $*J*3/W.components*W.byteLength;case 1023:return $*J*4/W.components*W.byteLength;case 1033:return $*J*4/W.components*W.byteLength;case 33776:case 33777:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*8;case 33778:case 33779:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 35841:case 35843:return Math.max($,16)*Math.max(J,8)/4;case 35840:case 35842:return Math.max($,8)*Math.max(J,8)/2;case 36196:case 37492:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*8;case 37496:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 37808:return Math.floor(($+3)/4)*Math.floor((J+3)/4)*16;case 37809:return Math.floor(($+4)/5)*Math.floor((J+3)/4)*16;case 37810:return Math.floor(($+4)/5)*Math.floor((J+4)/5)*16;case 37811:return Math.floor(($+5)/6)*Math.floor((J+4)/5)*16;case 37812:return Math.floor(($+5)/6)*Math.floor((J+5)/6)*16;case 37813:return Math.floor(($+7)/8)*Math.floor((J+4)/5)*16;case 37814:return Math.floor(($+7)/8)*Math.floor((J+5)/6)*16;case 37815:return Math.floor(($+7)/8)*Math.floor((J+7)/8)*16;case 37816:return Math.floor(($+9)/10)*Math.floor((J+4)/5)*16;case 37817:return Math.floor(($+9)/10)*Math.floor((J+5)/6)*16;case 37818:return Math.floor(($+9)/10)*Math.floor((J+7)/8)*16;case 37819:return Math.floor(($+9)/10)*Math.floor((J+9)/10)*16;case 37820:return Math.floor(($+11)/12)*Math.floor((J+9)/10)*16;case 37821:return Math.floor(($+11)/12)*Math.floor((J+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil($/4)*Math.ceil(J/4)*16;case 36283:case 36284:return Math.ceil($/4)*Math.ceil(J/4)*8;case 36285:case 36286:return Math.ceil($/4)*Math.ceil(J/4)*16}throw Error(`Unable to determine texture byte length for ${Q} format.`)}function KG($){switch($){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${$}.`)}function oK(){let $=null,J=!1,Q=null,Z=null;function W(K,Y){Q(K,Y),Z=$.requestAnimationFrame(W)}return{start:function(){if(J===!0)return;if(Q===null)return;Z=$.requestAnimationFrame(W),J=!0},stop:function(){$.cancelAnimationFrame(Z),J=!1},setAnimationLoop:function(K){Q=K},setContext:function(K){$=K}}}function UG($){let J=new WeakMap;function Q(q,G){let{array:V,usage:H}=q,N=V.byteLength,O=$.createBuffer();$.bindBuffer(G,O),$.bufferData(G,V,H),q.onUploadCallback();let P;if(V instanceof Float32Array)P=$.FLOAT;else if(typeof Float16Array<"u"&&V instanceof Float16Array)P=$.HALF_FLOAT;else if(V instanceof Uint16Array)if(q.isFloat16BufferAttribute)P=$.HALF_FLOAT;else P=$.UNSIGNED_SHORT;else if(V instanceof Int16Array)P=$.SHORT;else if(V instanceof Uint32Array)P=$.UNSIGNED_INT;else if(V instanceof Int32Array)P=$.INT;else if(V instanceof Int8Array)P=$.BYTE;else if(V instanceof Uint8Array)P=$.UNSIGNED_BYTE;else if(V instanceof Uint8ClampedArray)P=$.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+V);return{buffer:O,type:P,bytesPerElement:V.BYTES_PER_ELEMENT,version:q.version,size:N}}function Z(q,G,V){let{array:H,updateRanges:N}=G;if($.bindBuffer(V,q),N.length===0)$.bufferSubData(V,0,H);else{N.sort((P,D)=>P.start-D.start);let O=0;for(let P=1;P<N.length;P++){let D=N[O],C=N[P];if(C.start<=D.start+D.count+1)D.count=Math.max(D.count,C.start+C.count-D.start);else++O,N[O]=C}N.length=O+1;for(let P=0,D=N.length;P<D;P++){let C=N[P];$.bufferSubData(V,C.start*H.BYTES_PER_ELEMENT,H,C.start,C.count)}G.clearUpdateRanges()}G.onUploadCallback()}function W(q){if(q.isInterleavedBufferAttribute)q=q.data;return J.get(q)}function K(q){if(q.isInterleavedBufferAttribute)q=q.data;let G=J.get(q);if(G)$.deleteBuffer(G.buffer),J.delete(q)}function Y(q,G){if(q.isInterleavedBufferAttribute)q=q.data;if(q.isGLBufferAttribute){let H=J.get(q);if(!H||H.version<q.version)J.set(q,{buffer:q.buffer,type:q.type,bytesPerElement:q.elementSize,version:q.version});return}let V=J.get(q);if(V===void 0)J.set(q,Q(q,G));else if(V.version<q.version){if(V.size!==q.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(V.buffer,q,G),V.version=q.version}}return{get:W,remove:K,update:Y}}function uB($,J,Q,Z,W,K,Y){let q=new U6(0),G=K===!0?0:1,V,H,N=null,O=0,P=null;function D(R){let v=R.isScene===!0?R.background:null;if(v&&v.isTexture)v=(R.backgroundBlurriness>0?Q:J).get(v);return v}function C(R){let v=!1,g=D(R);if(g===null)L(q,G);else if(g&&g.isColor)L(g,1),v=!0;let y=$.xr.getEnvironmentBlendMode();if(y==="additive")Z.buffers.color.setClear(0,0,0,1,Y);else if(y==="alpha-blend")Z.buffers.color.setClear(0,0,0,0,Y);if($.autoClear||v)Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),$.clear($.autoClearColor,$.autoClearDepth,$.autoClearStencil)}function z(R,v){let g=D(v);if(g&&(g.isCubeTexture||g.mapping===306)){if(H===void 0)H=new O7(new t$(1,1,1),new n7({name:"BackgroundCubeMaterial",uniforms:s$(d7.backgroundCube.uniforms),vertexShader:d7.backgroundCube.vertexShader,fragmentShader:d7.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),H.geometry.deleteAttribute("normal"),H.geometry.deleteAttribute("uv"),H.onBeforeRender=function(y,M,p){this.matrixWorld.copyPosition(p.matrixWorld)},Object.defineProperty(H.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(H);if(K$.copy(v.backgroundRotation),K$.x*=-1,K$.y*=-1,K$.z*=-1,g.isCubeTexture&&g.isRenderTargetTexture===!1)K$.y*=-1,K$.z*=-1;if(H.material.uniforms.envMap.value=g,H.material.uniforms.flipEnvMap.value=g.isCubeTexture&&g.isRenderTargetTexture===!1?-1:1,H.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,H.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,H.material.uniforms.backgroundRotation.value.setFromMatrix4(pB.makeRotationFromEuler(K$)),H.material.toneMapped=I6.getTransfer(g.colorSpace)!=="srgb",N!==g||O!==g.version||P!==$.toneMapping)H.material.needsUpdate=!0,N=g,O=g.version,P=$.toneMapping;H.layers.enableAll(),R.unshift(H,H.geometry,H.material,0,0,null)}else if(g&&g.isTexture){if(V===void 0)V=new O7(new o5(2,2),new n7({name:"BackgroundMaterial",uniforms:s$(d7.background.uniforms),vertexShader:d7.background.vertexShader,fragmentShader:d7.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),V.geometry.deleteAttribute("normal"),Object.defineProperty(V.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(V);if(V.material.uniforms.t2D.value=g,V.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,V.material.toneMapped=I6.getTransfer(g.colorSpace)!=="srgb",g.matrixAutoUpdate===!0)g.updateMatrix();if(V.material.uniforms.uvTransform.value.copy(g.matrix),N!==g||O!==g.version||P!==$.toneMapping)V.material.needsUpdate=!0,N=g,O=g.version,P=$.toneMapping;V.layers.enableAll(),R.unshift(V,V.geometry,V.material,0,0,null)}}function L(R,v){R.getRGB(LJ,GK($)),Z.buffers.color.setClear(LJ.r,LJ.g,LJ.b,v,Y)}function T(){if(H!==void 0)H.geometry.dispose(),H.material.dispose(),H=void 0;if(V!==void 0)V.geometry.dispose(),V.material.dispose(),V=void 0}return{getClearColor:function(){return q},setClearColor:function(R,v=1){q.set(R),G=v,L(q,G)},getClearAlpha:function(){return G},setClearAlpha:function(R){G=R,L(q,G)},render:C,addToRenderList:z,dispose:T}}function lB($,J){let Q=$.getParameter($.MAX_VERTEX_ATTRIBS),Z={},W=O(null),K=W,Y=!1;function q(j,h,l,m,n){let o=!1,$0=N(m,l,h);if(K!==$0)K=$0,V(K.object);if(o=P(j,m,l,n),o)D(j,m,l,n);if(n!==null)J.update(n,$.ELEMENT_ARRAY_BUFFER);if(o||Y){if(Y=!1,v(j,h,l,m),n!==null)$.bindBuffer($.ELEMENT_ARRAY_BUFFER,J.get(n).buffer)}}function G(){return $.createVertexArray()}function V(j){return $.bindVertexArray(j)}function H(j){return $.deleteVertexArray(j)}function N(j,h,l){let m=l.wireframe===!0,n=Z[j.id];if(n===void 0)n={},Z[j.id]=n;let o=n[h.id];if(o===void 0)o={},n[h.id]=o;let $0=o[m];if($0===void 0)$0=O(G()),o[m]=$0;return $0}function O(j){let h=[],l=[],m=[];for(let n=0;n<Q;n++)h[n]=0,l[n]=0,m[n]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:h,enabledAttributes:l,attributeDivisors:m,object:j,attributes:{},index:null}}function P(j,h,l,m){let n=K.attributes,o=h.attributes,$0=0,F0=l.getAttributes();for(let J0 in F0)if(F0[J0].location>=0){let y0=n[J0],u0=o[J0];if(u0===void 0){if(J0==="instanceMatrix"&&j.instanceMatrix)u0=j.instanceMatrix;if(J0==="instanceColor"&&j.instanceColor)u0=j.instanceColor}if(y0===void 0)return!0;if(y0.attribute!==u0)return!0;if(u0&&y0.data!==u0.data)return!0;$0++}if(K.attributesNum!==$0)return!0;if(K.index!==m)return!0;return!1}function D(j,h,l,m){let n={},o=h.attributes,$0=0,F0=l.getAttributes();for(let J0 in F0)if(F0[J0].location>=0){let y0=o[J0];if(y0===void 0){if(J0==="instanceMatrix"&&j.instanceMatrix)y0=j.instanceMatrix;if(J0==="instanceColor"&&j.instanceColor)y0=j.instanceColor}let u0={};if(u0.attribute=y0,y0&&y0.data)u0.data=y0.data;n[J0]=u0,$0++}K.attributes=n,K.attributesNum=$0,K.index=m}function C(){let j=K.newAttributes;for(let h=0,l=j.length;h<l;h++)j[h]=0}function z(j){L(j,0)}function L(j,h){let{newAttributes:l,enabledAttributes:m,attributeDivisors:n}=K;if(l[j]=1,m[j]===0)$.enableVertexAttribArray(j),m[j]=1;if(n[j]!==h)$.vertexAttribDivisor(j,h),n[j]=h}function T(){let{newAttributes:j,enabledAttributes:h}=K;for(let l=0,m=h.length;l<m;l++)if(h[l]!==j[l])$.disableVertexAttribArray(l),h[l]=0}function R(j,h,l,m,n,o,$0){if($0===!0)$.vertexAttribIPointer(j,h,l,n,o);else $.vertexAttribPointer(j,h,l,m,n,o)}function v(j,h,l,m){C();let n=m.attributes,o=l.getAttributes(),$0=h.defaultAttributeValues;for(let F0 in o){let J0=o[F0];if(J0.location>=0){let I0=n[F0];if(I0===void 0){if(F0==="instanceMatrix"&&j.instanceMatrix)I0=j.instanceMatrix;if(F0==="instanceColor"&&j.instanceColor)I0=j.instanceColor}if(I0!==void 0){let{normalized:y0,itemSize:u0}=I0,t0=J.get(I0);if(t0===void 0)continue;let{buffer:O6,type:B6,bytesPerElement:q0}=t0,S0=B6===$.INT||B6===$.UNSIGNED_INT||I0.gpuType===1013;if(I0.isInterleavedBufferAttribute){let A0=I0.data,l0=A0.stride,z0=I0.offset;if(A0.isInstancedInterleavedBuffer){for(let e0=0;e0<J0.locationSize;e0++)L(J0.location+e0,A0.meshPerAttribute);if(j.isInstancedMesh!==!0&&m._maxInstanceCount===void 0)m._maxInstanceCount=A0.meshPerAttribute*A0.count}else for(let e0=0;e0<J0.locationSize;e0++)z(J0.location+e0);$.bindBuffer($.ARRAY_BUFFER,O6);for(let e0=0;e0<J0.locationSize;e0++)R(J0.location+e0,u0/J0.locationSize,B6,y0,l0*q0,(z0+u0/J0.locationSize*e0)*q0,S0)}else{if(I0.isInstancedBufferAttribute){for(let A0=0;A0<J0.locationSize;A0++)L(J0.location+A0,I0.meshPerAttribute);if(j.isInstancedMesh!==!0&&m._maxInstanceCount===void 0)m._maxInstanceCount=I0.meshPerAttribute*I0.count}else for(let A0=0;A0<J0.locationSize;A0++)z(J0.location+A0);$.bindBuffer($.ARRAY_BUFFER,O6);for(let A0=0;A0<J0.locationSize;A0++)R(J0.location+A0,u0/J0.locationSize,B6,y0,u0*q0,u0/J0.locationSize*A0*q0,S0)}}else if($0!==void 0){let y0=$0[F0];if(y0!==void 0)switch(y0.length){case 2:$.vertexAttrib2fv(J0.location,y0);break;case 3:$.vertexAttrib3fv(J0.location,y0);break;case 4:$.vertexAttrib4fv(J0.location,y0);break;default:$.vertexAttrib1fv(J0.location,y0)}}}}T()}function g(){p();for(let j in Z){let h=Z[j];for(let l in h){let m=h[l];for(let n in m)H(m[n].object),delete m[n];delete h[l]}delete Z[j]}}function y(j){if(Z[j.id]===void 0)return;let h=Z[j.id];for(let l in h){let m=h[l];for(let n in m)H(m[n].object),delete m[n];delete h[l]}delete Z[j.id]}function M(j){for(let h in Z){let l=Z[h];if(l[j.id]===void 0)continue;let m=l[j.id];for(let n in m)H(m[n].object),delete m[n];delete l[j.id]}}function p(){if(A(),Y=!0,K===W)return;K=W,V(K.object)}function A(){W.geometry=null,W.program=null,W.wireframe=!1}return{setup:q,reset:p,resetDefaultState:A,dispose:g,releaseStatesOfGeometry:y,releaseStatesOfProgram:M,initAttributes:C,enableAttribute:z,disableUnusedAttributes:T}}function mB($,J,Q){let Z;function W(V){Z=V}function K(V,H){$.drawArrays(Z,V,H),Q.update(H,Z,1)}function Y(V,H,N){if(N===0)return;$.drawArraysInstanced(Z,V,H,N),Q.update(H,Z,N)}function q(V,H,N){if(N===0)return;J.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,V,0,H,0,N);let P=0;for(let D=0;D<N;D++)P+=H[D];Q.update(P,Z,1)}function G(V,H,N,O){if(N===0)return;let P=J.get("WEBGL_multi_draw");if(P===null)for(let D=0;D<V.length;D++)Y(V[D],H[D],O[D]);else{P.multiDrawArraysInstancedWEBGL(Z,V,0,H,0,O,0,N);let D=0;for(let C=0;C<N;C++)D+=H[C]*O[C];Q.update(D,Z,1)}}this.setMode=W,this.render=K,this.renderInstances=Y,this.renderMultiDraw=q,this.renderMultiDrawInstances=G}function dB($,J,Q,Z){let W;function K(){if(W!==void 0)return W;if(J.has("EXT_texture_filter_anisotropic")===!0){let M=J.get("EXT_texture_filter_anisotropic");W=$.getParameter(M.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else W=0;return W}function Y(M){if(M!==1023&&Z.convert(M)!==$.getParameter($.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function q(M){let p=M===1016&&(J.has("EXT_color_buffer_half_float")||J.has("EXT_color_buffer_float"));if(M!==1009&&Z.convert(M)!==$.getParameter($.IMPLEMENTATION_COLOR_READ_TYPE)&&M!==1015&&!p)return!1;return!0}function G(M){if(M==="highp"){if($.getShaderPrecisionFormat($.VERTEX_SHADER,$.HIGH_FLOAT).precision>0&&$.getShaderPrecisionFormat($.FRAGMENT_SHADER,$.HIGH_FLOAT).precision>0)return"highp";M="mediump"}if(M==="mediump"){if($.getShaderPrecisionFormat($.VERTEX_SHADER,$.MEDIUM_FLOAT).precision>0&&$.getShaderPrecisionFormat($.FRAGMENT_SHADER,$.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let V=Q.precision!==void 0?Q.precision:"highp",H=G(V);if(H!==V)console.warn("THREE.WebGLRenderer:",V,"not supported, using",H,"instead."),V=H;let N=Q.logarithmicDepthBuffer===!0,O=Q.reversedDepthBuffer===!0&&J.has("EXT_clip_control"),P=$.getParameter($.MAX_TEXTURE_IMAGE_UNITS),D=$.getParameter($.MAX_VERTEX_TEXTURE_IMAGE_UNITS),C=$.getParameter($.MAX_TEXTURE_SIZE),z=$.getParameter($.MAX_CUBE_MAP_TEXTURE_SIZE),L=$.getParameter($.MAX_VERTEX_ATTRIBS),T=$.getParameter($.MAX_VERTEX_UNIFORM_VECTORS),R=$.getParameter($.MAX_VARYING_VECTORS),v=$.getParameter($.MAX_FRAGMENT_UNIFORM_VECTORS),g=D>0,y=$.getParameter($.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:K,getMaxPrecision:G,textureFormatReadable:Y,textureTypeReadable:q,precision:V,logarithmicDepthBuffer:N,reversedDepthBuffer:O,maxTextures:P,maxVertexTextures:D,maxTextureSize:C,maxCubemapSize:z,maxAttributes:L,maxVertexUniforms:T,maxVaryings:R,maxFragmentUniforms:v,vertexTextures:g,maxSamples:y}}function cB($){let J=this,Q=null,Z=0,W=!1,K=!1,Y=new v8,q=new K6,G={value:null,needsUpdate:!1};this.uniform=G,this.numPlanes=0,this.numIntersection=0,this.init=function(N,O){let P=N.length!==0||O||Z!==0||W;return W=O,Z=N.length,P},this.beginShadows=function(){K=!0,H(null)},this.endShadows=function(){K=!1},this.setGlobalState=function(N,O){Q=H(N,O,0)},this.setState=function(N,O,P){let{clippingPlanes:D,clipIntersection:C,clipShadows:z}=N,L=$.get(N);if(!W||D===null||D.length===0||K&&!z)if(K)H(null);else V();else{let T=K?0:Z,R=T*4,v=L.clippingState||null;G.value=v,v=H(D,O,R,P);for(let g=0;g!==R;++g)v[g]=Q[g];L.clippingState=v,this.numIntersection=C?this.numPlanes:0,this.numPlanes+=T}};function V(){if(G.value!==Q)G.value=Q,G.needsUpdate=Z>0;J.numPlanes=Z,J.numIntersection=0}function H(N,O,P,D){let C=N!==null?N.length:0,z=null;if(C!==0){if(z=G.value,D!==!0||z===null){let L=P+C*4,T=O.matrixWorldInverse;if(q.getNormalMatrix(T),z===null||z.length<L)z=new Float32Array(L);for(let R=0,v=P;R!==C;++R,v+=4)Y.copy(N[R]).applyMatrix4(T,q),Y.normal.toArray(z,v),z[v+3]=Y.constant}G.value=z,G.needsUpdate=!0}return J.numPlanes=C,J.numIntersection=0,z}}function nB($){let J=new WeakMap;function Q(Y,q){if(q===303)Y.mapping=301;else if(q===304)Y.mapping=302;return Y}function Z(Y){if(Y&&Y.isTexture){let q=Y.mapping;if(q===303||q===304)if(J.has(Y)){let G=J.get(Y).texture;return Q(G,Y.mapping)}else{let G=Y.image;if(G&&G.height>0){let V=new BK(G.height);return V.fromEquirectangularTexture($,Y),J.set(Y,V),Y.addEventListener("dispose",W),Q(V.texture,Y.mapping)}else return null}}return Y}function W(Y){let q=Y.target;q.removeEventListener("dispose",W);let G=J.get(q);if(G!==void 0)J.delete(q),G.dispose()}function K(){J=new WeakMap}return{get:Z,dispose:K}}class R1{constructor($){this._renderer=$,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene($,J=0,Q=0.1,Z=100,W={}){let{size:K=256,position:Y=iB}=W;O1=this._renderer.getRenderTarget(),L1=this._renderer.getActiveCubeFace(),P1=this._renderer.getActiveMipmapLevel(),z1=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(K);let q=this._allocateTargets();if(q.depthBuffer=!0,this._sceneToCubeUV($,Q,Z,q,Y),J>0)this._blur(q,0,0,J);return this._applyPMREM(q),this._cleanup(q),q}fromEquirectangular($,J=null){return this._fromTexture($,J)}fromCubemap($,J=null){return this._fromTexture($,J)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=p4(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=g4(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose()}_setSize($){this._lodMax=Math.floor(Math.log2($)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let $=0;$<this._lodPlanes.length;$++)this._lodPlanes[$].dispose()}_cleanup($){this._renderer.setRenderTarget(O1,L1,P1),this._renderer.xr.enabled=z1,$.scissorTest=!1,PJ($,0,0,$.width,$.height)}_fromTexture($,J){if($.mapping===301||$.mapping===302)this._setSize($.image.length===0?16:$.image[0].width||$.image[0].image.width);else this._setSize($.image.width/4);O1=this._renderer.getRenderTarget(),L1=this._renderer.getActiveCubeFace(),P1=this._renderer.getActiveMipmapLevel(),z1=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let Q=J||this._allocateTargets();return this._textureToCubeUV($,Q),this._applyPMREM(Q),this._cleanup(Q),Q}_allocateTargets(){let $=3*Math.max(this._cubeSize,112),J=4*this._cubeSize,Q={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:"srgb-linear",depthBuffer:!1},Z=f4($,J,Q);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==$||this._pingPongRenderTarget.height!==J){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=f4($,J,Q);let{_lodMax:W}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=sB(W)),this._blurMaterial=oB(W,$,J)}return Z}_compileMaterial($){let J=new O7(this._lodPlanes[0],$);this._renderer.compile(J,F1)}_sceneToCubeUV($,J,Q,Z,W){let q=new B7(90,1,J,Q),G=[1,-1,1,1,1,1],V=[1,1,1,-1,-1,-1],H=this._renderer,N=H.autoClear,O=H.toneMapping;if(H.getClearColor(x4),H.toneMapping=0,H.autoClear=!1,H.state.buffers.depth.getReversed())H.setRenderTarget(Z),H.clearDepth(),H.setRenderTarget(null);let D=new jJ({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),C=new O7(new t$,D),z=!1,L=$.background;if(L){if(L.isColor)D.color.copy(L),$.background=null,z=!0}else D.color.copy(x4),z=!0;for(let T=0;T<6;T++){let R=T%3;if(R===0)q.up.set(0,G[T],0),q.position.set(W.x,W.y,W.z),q.lookAt(W.x+V[T],W.y,W.z);else if(R===1)q.up.set(0,0,G[T]),q.position.set(W.x,W.y,W.z),q.lookAt(W.x,W.y+V[T],W.z);else q.up.set(0,G[T],0),q.position.set(W.x,W.y,W.z),q.lookAt(W.x,W.y,W.z+V[T]);let v=this._cubeSize;if(PJ(Z,R*v,T>2?v:0,v,v),H.setRenderTarget(Z),z)H.render(C,q);H.render($,q)}C.geometry.dispose(),C.material.dispose(),H.toneMapping=O,H.autoClear=N,$.background=L}_textureToCubeUV($,J){let Q=this._renderer,Z=$.mapping===301||$.mapping===302;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=p4();this._cubemapMaterial.uniforms.flipEnvMap.value=$.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=g4();let W=Z?this._cubemapMaterial:this._equirectMaterial,K=new O7(this._lodPlanes[0],W),Y=W.uniforms;Y.envMap.value=$;let q=this._cubeSize;PJ(J,0,0,3*q,2*q),Q.setRenderTarget(J),Q.render(K,F1)}_applyPMREM($){let J=this._renderer,Q=J.autoClear;J.autoClear=!1;let Z=this._lodPlanes.length;for(let W=1;W<Z;W++){let K=Math.sqrt(this._sigmas[W]*this._sigmas[W]-this._sigmas[W-1]*this._sigmas[W-1]),Y=b4[(Z-W-1)%b4.length];this._blur($,W-1,W,K,Y)}J.autoClear=Q}_blur($,J,Q,Z,W){let K=this._pingPongRenderTarget;this._halfBlur($,K,J,Q,Z,"latitudinal",W),this._halfBlur(K,$,Q,Q,Z,"longitudinal",W)}_halfBlur($,J,Q,Z,W,K,Y){let q=this._renderer,G=this._blurMaterial;if(K!=="latitudinal"&&K!=="longitudinal")console.error("blur direction must be either latitudinal or longitudinal!");let V=3,H=new O7(this._lodPlanes[Z],G),N=G.uniforms,O=this._sizeLods[Q]-1,P=isFinite(W)?Math.PI/(2*O):2*Math.PI/(2*q$-1),D=W/P,C=isFinite(W)?1+Math.floor(V*D):q$;if(C>q$)console.warn(`sigmaRadians, ${W}, is too large and will clip, as it requested ${C} samples when the maximum is set to ${q$}`);let z=[],L=0;for(let y=0;y<q$;++y){let M=y/D,p=Math.exp(-M*M/2);if(z.push(p),y===0)L+=p;else if(y<C)L+=2*p}for(let y=0;y<z.length;y++)z[y]=z[y]/L;if(N.envMap.value=$.texture,N.samples.value=C,N.weights.value=z,N.latitudinal.value=K==="latitudinal",Y)N.poleAxis.value=Y;let{_lodMax:T}=this;N.dTheta.value=P,N.mipInt.value=T-Q;let R=this._sizeLods[Z],v=3*R*(Z>T-c$?Z-T+c$:0),g=4*(this._cubeSize-R);PJ(J,v,g,3*R,2*R),q.setRenderTarget(J),q.render(H,F1)}}function sB($){let J=[],Q=[],Z=[],W=$,K=$-c$+1+h4.length;for(let Y=0;Y<K;Y++){let q=Math.pow(2,W);Q.push(q);let G=1/q;if(Y>$-c$)G=h4[Y-$+c$-1];else if(Y===0)G=0;Z.push(G);let V=1/(q-2),H=-V,N=1+V,O=[H,H,N,H,N,N,H,H,N,N,H,N],P=6,D=6,C=3,z=2,L=1,T=new Float32Array(C*D*P),R=new Float32Array(z*D*P),v=new Float32Array(L*D*P);for(let y=0;y<P;y++){let M=y%3*2/3-1,p=y>2?0:-1,A=[M,p,0,M+0.6666666666666666,p,0,M+0.6666666666666666,p+1,0,M,p,0,M+0.6666666666666666,p+1,0,M,p+1,0];T.set(A,C*D*y),R.set(O,z*D*y);let j=[y,y,y,y,y,y];v.set(j,L*D*y)}let g=new H7;if(g.setAttribute("position",new L7(T,C)),g.setAttribute("uv",new L7(R,z)),g.setAttribute("faceIndex",new L7(v,L)),J.push(g),W>c$)W--}return{lodPlanes:J,sizeLods:Q,sigmas:Z}}function f4($,J,Q){let Z=new G8($,J,Q);return Z.texture.mapping=306,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function PJ($,J,Q,Z,W){$.viewport.set(J,Q,Z,W),$.scissor.set(J,Q,Z,W)}function oB($,J,Q){let Z=new Float32Array(q$),W=new d(0,1,0);return new n7({name:"SphericalGaussianBlur",defines:{n:q$,CUBEUV_TEXEL_WIDTH:1/J,CUBEUV_TEXEL_HEIGHT:1/Q,CUBEUV_MAX_MIP:`${$}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:W}},vertexShader:a1(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function g4(){return new n7({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:a1(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function p4(){return new n7({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:a1(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function a1(){return`

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
	`}function aB($){let J=new WeakMap,Q=null;function Z(q){if(q&&q.isTexture){let G=q.mapping,V=G===303||G===304,H=G===301||G===302;if(V||H){let N=J.get(q),O=N!==void 0?N.texture.pmremVersion:0;if(q.isRenderTargetTexture&&q.pmremVersion!==O){if(Q===null)Q=new R1($);return N=V?Q.fromEquirectangular(q,N):Q.fromCubemap(q,N),N.texture.pmremVersion=q.pmremVersion,J.set(q,N),N.texture}else if(N!==void 0)return N.texture;else{let P=q.image;if(V&&P&&P.height>0||H&&P&&W(P)){if(Q===null)Q=new R1($);return N=V?Q.fromEquirectangular(q):Q.fromCubemap(q),N.texture.pmremVersion=q.pmremVersion,J.set(q,N),q.addEventListener("dispose",K),N.texture}else return null}}}return q}function W(q){let G=0,V=6;for(let H=0;H<V;H++)if(q[H]!==void 0)G++;return G===V}function K(q){let G=q.target;G.removeEventListener("dispose",K);let V=J.get(G);if(V!==void 0)J.delete(G),V.dispose()}function Y(){if(J=new WeakMap,Q!==null)Q.dispose(),Q=null}return{get:Z,dispose:Y}}function rB($){let J={};function Q(Z){if(J[Z]!==void 0)return J[Z];let W;switch(Z){case"WEBGL_depth_texture":W=$.getExtension("WEBGL_depth_texture")||$.getExtension("MOZ_WEBGL_depth_texture")||$.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":W=$.getExtension("EXT_texture_filter_anisotropic")||$.getExtension("MOZ_EXT_texture_filter_anisotropic")||$.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":W=$.getExtension("WEBGL_compressed_texture_s3tc")||$.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||$.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":W=$.getExtension("WEBGL_compressed_texture_pvrtc")||$.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:W=$.getExtension(Z)}return J[Z]=W,W}return{has:function(Z){return Q(Z)!==null},init:function(){Q("EXT_color_buffer_float"),Q("WEBGL_clip_cull_distance"),Q("OES_texture_float_linear"),Q("EXT_color_buffer_half_float"),Q("WEBGL_multisampled_render_to_texture"),Q("WEBGL_render_shared_exponent")},get:function(Z){let W=Q(Z);if(W===null)i5("THREE.WebGLRenderer: "+Z+" extension not supported.");return W}}}function tB($,J,Q,Z){let W={},K=new WeakMap;function Y(N){let O=N.target;if(O.index!==null)J.remove(O.index);for(let D in O.attributes)J.remove(O.attributes[D]);O.removeEventListener("dispose",Y),delete W[O.id];let P=K.get(O);if(P)J.remove(P),K.delete(O);if(Z.releaseStatesOfGeometry(O),O.isInstancedBufferGeometry===!0)delete O._maxInstanceCount;Q.memory.geometries--}function q(N,O){if(W[O.id]===!0)return O;return O.addEventListener("dispose",Y),W[O.id]=!0,Q.memory.geometries++,O}function G(N){let O=N.attributes;for(let P in O)J.update(O[P],$.ARRAY_BUFFER)}function V(N){let O=[],P=N.index,D=N.attributes.position,C=0;if(P!==null){let T=P.array;C=P.version;for(let R=0,v=T.length;R<v;R+=3){let g=T[R+0],y=T[R+1],M=T[R+2];O.push(g,y,y,M,M,g)}}else if(D!==void 0){let T=D.array;C=D.version;for(let R=0,v=T.length/3-1;R<v;R+=3){let g=R+0,y=R+1,M=R+2;O.push(g,y,y,M,M,g)}}else return;let z=new((WK(O))?w1:j1)(O,1);z.version=C;let L=K.get(N);if(L)J.remove(L);K.set(N,z)}function H(N){let O=K.get(N);if(O){let P=N.index;if(P!==null){if(O.version<P.version)V(N)}}else V(N);return K.get(N)}return{get:q,update:G,getWireframeAttribute:H}}function eB($,J,Q){let Z;function W(O){Z=O}let K,Y;function q(O){K=O.type,Y=O.bytesPerElement}function G(O,P){$.drawElements(Z,P,K,O*Y),Q.update(P,Z,1)}function V(O,P,D){if(D===0)return;$.drawElementsInstanced(Z,P,K,O*Y,D),Q.update(P,Z,D)}function H(O,P,D){if(D===0)return;J.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,P,0,K,O,0,D);let z=0;for(let L=0;L<D;L++)z+=P[L];Q.update(z,Z,1)}function N(O,P,D,C){if(D===0)return;let z=J.get("WEBGL_multi_draw");if(z===null)for(let L=0;L<O.length;L++)V(O[L]/Y,P[L],C[L]);else{z.multiDrawElementsInstancedWEBGL(Z,P,0,K,O,0,C,0,D);let L=0;for(let T=0;T<D;T++)L+=P[T]*C[T];Q.update(L,Z,1)}}this.setMode=W,this.setIndex=q,this.render=G,this.renderInstances=V,this.renderMultiDraw=H,this.renderMultiDrawInstances=N}function $2($){let J={geometries:0,textures:0},Q={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(K,Y,q){switch(Q.calls++,Y){case $.TRIANGLES:Q.triangles+=q*(K/3);break;case $.LINES:Q.lines+=q*(K/2);break;case $.LINE_STRIP:Q.lines+=q*(K-1);break;case $.LINE_LOOP:Q.lines+=q*K;break;case $.POINTS:Q.points+=q*K;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",Y);break}}function W(){Q.calls=0,Q.triangles=0,Q.points=0,Q.lines=0}return{memory:J,render:Q,programs:null,autoReset:!0,reset:W,update:Z}}function J2($,J,Q){let Z=new WeakMap,W=new S6;function K(Y,q,G){let V=Y.morphTargetInfluences,H=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,N=H!==void 0?H.length:0,O=Z.get(q);if(O===void 0||O.count!==N){let A=function(){M.dispose(),Z.delete(q),q.removeEventListener("dispose",A)};if(O!==void 0)O.texture.dispose();let P=q.morphAttributes.position!==void 0,D=q.morphAttributes.normal!==void 0,C=q.morphAttributes.color!==void 0,z=q.morphAttributes.position||[],L=q.morphAttributes.normal||[],T=q.morphAttributes.color||[],R=0;if(P===!0)R=1;if(D===!0)R=2;if(C===!0)R=3;let v=q.attributes.position.count*R,g=1;if(v>J.maxTextureSize)g=Math.ceil(v/J.maxTextureSize),v=J.maxTextureSize;let y=new Float32Array(v*g*4*N),M=new A1(y,v,g,N);M.type=1015,M.needsUpdate=!0;let p=R*4;for(let j=0;j<N;j++){let h=z[j],l=L[j],m=T[j],n=v*g*4*j;for(let o=0;o<h.count;o++){let $0=o*p;if(P===!0)W.fromBufferAttribute(h,o),y[n+$0+0]=W.x,y[n+$0+1]=W.y,y[n+$0+2]=W.z,y[n+$0+3]=0;if(D===!0)W.fromBufferAttribute(l,o),y[n+$0+4]=W.x,y[n+$0+5]=W.y,y[n+$0+6]=W.z,y[n+$0+7]=0;if(C===!0)W.fromBufferAttribute(m,o),y[n+$0+8]=W.x,y[n+$0+9]=W.y,y[n+$0+10]=W.z,y[n+$0+11]=m.itemSize===4?W.w:1}}O={count:N,texture:M,size:new V6(v,g)},Z.set(q,O),q.addEventListener("dispose",A)}if(Y.isInstancedMesh===!0&&Y.morphTexture!==null)G.getUniforms().setValue($,"morphTexture",Y.morphTexture,Q);else{let P=0;for(let C=0;C<V.length;C++)P+=V[C];let D=q.morphTargetsRelative?1:1-P;G.getUniforms().setValue($,"morphTargetBaseInfluence",D),G.getUniforms().setValue($,"morphTargetInfluences",V)}G.getUniforms().setValue($,"morphTargetsTexture",O.texture,Q),G.getUniforms().setValue($,"morphTargetsTextureSize",O.size)}return{update:K}}function Q2($,J,Q,Z){let W=new WeakMap;function K(G){let V=Z.render.frame,H=G.geometry,N=J.get(G,H);if(W.get(N)!==V)J.update(N),W.set(N,V);if(G.isInstancedMesh){if(G.hasEventListener("dispose",q)===!1)G.addEventListener("dispose",q);if(W.get(G)!==V){if(Q.update(G.instanceMatrix,$.ARRAY_BUFFER),G.instanceColor!==null)Q.update(G.instanceColor,$.ARRAY_BUFFER);W.set(G,V)}}if(G.isSkinnedMesh){let O=G.skeleton;if(W.get(O)!==V)O.update(),W.set(O,V)}return N}function Y(){W=new WeakMap}function q(G){let V=G.target;if(V.removeEventListener("dispose",q),Q.remove(V.instanceMatrix),V.instanceColor!==null)Q.remove(V.instanceColor)}return{update:K,dispose:Y}}function J5($,J,Q){let Z=$[0];if(Z<=0||Z>0)return $;let W=J*Q,K=l4[W];if(K===void 0)K=new Float32Array(W),l4[W]=K;if(J!==0){Z.toArray(K,0);for(let Y=1,q=0;Y!==J;++Y)q+=Q,$[Y].toArray(K,q)}return K}function n6($,J){if($.length!==J.length)return!1;for(let Q=0,Z=$.length;Q<Z;Q++)if($[Q]!==J[Q])return!1;return!0}function i6($,J){for(let Q=0,Z=J.length;Q<Z;Q++)$[Q]=J[Q]}function hJ($,J){let Q=m4[J];if(Q===void 0)Q=new Int32Array(J),m4[J]=Q;for(let Z=0;Z!==J;++Z)Q[Z]=$.allocateTextureUnit();return Q}function Z2($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1f(this.addr,J),Q[0]=J}function W2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2f(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(n6(Q,J))return;$.uniform2fv(this.addr,J),i6(Q,J)}}function K2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3f(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else if(J.r!==void 0){if(Q[0]!==J.r||Q[1]!==J.g||Q[2]!==J.b)$.uniform3f(this.addr,J.r,J.g,J.b),Q[0]=J.r,Q[1]=J.g,Q[2]=J.b}else{if(n6(Q,J))return;$.uniform3fv(this.addr,J),i6(Q,J)}}function U2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4f(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(n6(Q,J))return;$.uniform4fv(this.addr,J),i6(Q,J)}}function Y2($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(n6(Q,J))return;$.uniformMatrix2fv(this.addr,!1,J),i6(Q,J)}else{if(n6(Q,Z))return;n4.set(Z),$.uniformMatrix2fv(this.addr,!1,n4),i6(Q,Z)}}function q2($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(n6(Q,J))return;$.uniformMatrix3fv(this.addr,!1,J),i6(Q,J)}else{if(n6(Q,Z))return;c4.set(Z),$.uniformMatrix3fv(this.addr,!1,c4),i6(Q,Z)}}function X2($,J){let Q=this.cache,Z=J.elements;if(Z===void 0){if(n6(Q,J))return;$.uniformMatrix4fv(this.addr,!1,J),i6(Q,J)}else{if(n6(Q,Z))return;d4.set(Z),$.uniformMatrix4fv(this.addr,!1,d4),i6(Q,Z)}}function G2($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1i(this.addr,J),Q[0]=J}function V2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2i(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(n6(Q,J))return;$.uniform2iv(this.addr,J),i6(Q,J)}}function B2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3i(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else{if(n6(Q,J))return;$.uniform3iv(this.addr,J),i6(Q,J)}}function H2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4i(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(n6(Q,J))return;$.uniform4iv(this.addr,J),i6(Q,J)}}function N2($,J){let Q=this.cache;if(Q[0]===J)return;$.uniform1ui(this.addr,J),Q[0]=J}function F2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y)$.uniform2ui(this.addr,J.x,J.y),Q[0]=J.x,Q[1]=J.y}else{if(n6(Q,J))return;$.uniform2uiv(this.addr,J),i6(Q,J)}}function O2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z)$.uniform3ui(this.addr,J.x,J.y,J.z),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z}else{if(n6(Q,J))return;$.uniform3uiv(this.addr,J),i6(Q,J)}}function L2($,J){let Q=this.cache;if(J.x!==void 0){if(Q[0]!==J.x||Q[1]!==J.y||Q[2]!==J.z||Q[3]!==J.w)$.uniform4ui(this.addr,J.x,J.y,J.z,J.w),Q[0]=J.x,Q[1]=J.y,Q[2]=J.z,Q[3]=J.w}else{if(n6(Q,J))return;$.uniform4uiv(this.addr,J),i6(Q,J)}}function P2($,J,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)$.uniform1i(this.addr,W),Z[0]=W;let K;if(this.type===$.SAMPLER_2D_SHADOW)u4.compareFunction=515,K=u4;else K=aK;Q.setTexture2D(J||K,W)}function z2($,J,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)$.uniform1i(this.addr,W),Z[0]=W;Q.setTexture3D(J||tK,W)}function I2($,J,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)$.uniform1i(this.addr,W),Z[0]=W;Q.setTextureCube(J||eK,W)}function D2($,J,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)$.uniform1i(this.addr,W),Z[0]=W;Q.setTexture2DArray(J||rK,W)}function C2($){switch($){case 5126:return Z2;case 35664:return W2;case 35665:return K2;case 35666:return U2;case 35674:return Y2;case 35675:return q2;case 35676:return X2;case 5124:case 35670:return G2;case 35667:case 35671:return V2;case 35668:case 35672:return B2;case 35669:case 35673:return H2;case 5125:return N2;case 36294:return F2;case 36295:return O2;case 36296:return L2;case 35678:case 36198:case 36298:case 36306:case 35682:return P2;case 35679:case 36299:case 36307:return z2;case 35680:case 36300:case 36308:case 36293:return I2;case 36289:case 36303:case 36311:case 36292:return D2}}function R2($,J){$.uniform1fv(this.addr,J)}function E2($,J){let Q=J5(J,this.size,2);$.uniform2fv(this.addr,Q)}function S2($,J){let Q=J5(J,this.size,3);$.uniform3fv(this.addr,Q)}function A2($,J){let Q=J5(J,this.size,4);$.uniform4fv(this.addr,Q)}function j2($,J){let Q=J5(J,this.size,4);$.uniformMatrix2fv(this.addr,!1,Q)}function w2($,J){let Q=J5(J,this.size,9);$.uniformMatrix3fv(this.addr,!1,Q)}function M2($,J){let Q=J5(J,this.size,16);$.uniformMatrix4fv(this.addr,!1,Q)}function T2($,J){$.uniform1iv(this.addr,J)}function k2($,J){$.uniform2iv(this.addr,J)}function v2($,J){$.uniform3iv(this.addr,J)}function _2($,J){$.uniform4iv(this.addr,J)}function y2($,J){$.uniform1uiv(this.addr,J)}function h2($,J){$.uniform2uiv(this.addr,J)}function x2($,J){$.uniform3uiv(this.addr,J)}function b2($,J){$.uniform4uiv(this.addr,J)}function f2($,J,Q){let Z=this.cache,W=J.length,K=hJ(Q,W);if(!n6(Z,K))$.uniform1iv(this.addr,K),i6(Z,K);for(let Y=0;Y!==W;++Y)Q.setTexture2D(J[Y]||aK,K[Y])}function g2($,J,Q){let Z=this.cache,W=J.length,K=hJ(Q,W);if(!n6(Z,K))$.uniform1iv(this.addr,K),i6(Z,K);for(let Y=0;Y!==W;++Y)Q.setTexture3D(J[Y]||tK,K[Y])}function p2($,J,Q){let Z=this.cache,W=J.length,K=hJ(Q,W);if(!n6(Z,K))$.uniform1iv(this.addr,K),i6(Z,K);for(let Y=0;Y!==W;++Y)Q.setTextureCube(J[Y]||eK,K[Y])}function u2($,J,Q){let Z=this.cache,W=J.length,K=hJ(Q,W);if(!n6(Z,K))$.uniform1iv(this.addr,K),i6(Z,K);for(let Y=0;Y!==W;++Y)Q.setTexture2DArray(J[Y]||rK,K[Y])}function l2($){switch($){case 5126:return R2;case 35664:return E2;case 35665:return S2;case 35666:return A2;case 35674:return j2;case 35675:return w2;case 35676:return M2;case 5124:case 35670:return T2;case 35667:case 35671:return k2;case 35668:case 35672:return v2;case 35669:case 35673:return _2;case 5125:return y2;case 36294:return h2;case 36295:return x2;case 36296:return b2;case 35678:case 36198:case 36298:case 36306:case 35682:return f2;case 35679:case 36299:case 36307:return g2;case 35680:case 36300:case 36308:case 36293:return p2;case 36289:case 36303:case 36311:case 36292:return u2}}class $3{constructor($,J,Q){this.id=$,this.addr=Q,this.cache=[],this.type=J.type,this.setValue=C2(J.type)}}class J3{constructor($,J,Q){this.id=$,this.addr=Q,this.cache=[],this.type=J.type,this.size=J.size,this.setValue=l2(J.type)}}class Q3{constructor($){this.id=$,this.seq=[],this.map={}}setValue($,J,Q){let Z=this.seq;for(let W=0,K=Z.length;W!==K;++W){let Y=Z[W];Y.setValue($,J[Y.id],Q)}}}function i4($,J){$.seq.push(J),$.map[J.id]=J}function m2($,J,Q){let Z=$.name,W=Z.length;I1.lastIndex=0;while(!0){let K=I1.exec(Z),Y=I1.lastIndex,q=K[1],G=K[2]==="]",V=K[3];if(G)q=q|0;if(V===void 0||V==="["&&Y+2===W){i4(Q,V===void 0?new $3(q,$,J):new J3(q,$,J));break}else{let N=Q.map[q];if(N===void 0)N=new Q3(q),i4(Q,N);Q=N}}}class c5{constructor($,J){this.seq=[],this.map={};let Q=$.getProgramParameter(J,$.ACTIVE_UNIFORMS);for(let Z=0;Z<Q;++Z){let W=$.getActiveUniform(J,Z),K=$.getUniformLocation(J,W.name);m2(W,K,this)}}setValue($,J,Q,Z){let W=this.map[J];if(W!==void 0)W.setValue($,Q,Z)}setOptional($,J,Q){let Z=J[Q];if(Z!==void 0)this.setValue($,Q,Z)}static upload($,J,Q,Z){for(let W=0,K=J.length;W!==K;++W){let Y=J[W],q=Q[Y.id];if(q.needsUpdate!==!1)Y.setValue($,q.value,Z)}}static seqWithValue($,J){let Q=[];for(let Z=0,W=$.length;Z!==W;++Z){let K=$[Z];if(K.id in J)Q.push(K)}return Q}}function s4($,J,Q){let Z=$.createShader(J);return $.shaderSource(Z,Q),$.compileShader(Z),Z}function n2($,J){let Q=$.split(`
`),Z=[],W=Math.max(J-6,0),K=Math.min(J+6,Q.length);for(let Y=W;Y<K;Y++){let q=Y+1;Z.push(`${q===J?">":" "} ${q}: ${Q[Y]}`)}return Z.join(`
`)}function i2($){I6._getMatrix(o4,I6.workingColorSpace,$);let J=`mat3( ${o4.elements.map((Q)=>Q.toFixed(4))} )`;switch(I6.getTransfer($)){case"linear":return[J,"LinearTransferOETF"];case"srgb":return[J,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",$),[J,"LinearTransferOETF"]}}function a4($,J,Q){let Z=$.getShaderParameter(J,$.COMPILE_STATUS),K=($.getShaderInfoLog(J)||"").trim();if(Z&&K==="")return"";let Y=/ERROR: 0:(\d+)/.exec(K);if(Y){let q=parseInt(Y[1]);return Q.toUpperCase()+`

`+K+`

`+n2($.getShaderSource(J),q)}else return K}function s2($,J){let Q=i2(J);return[`vec4 ${$}( vec4 value ) {`,`	return ${Q[1]}( vec4( value.rgb * ${Q[0]}, value.a ) );`,"}"].join(`
`)}function o2($,J){let Q;switch(J){case 1:Q="Linear";break;case 2:Q="Reinhard";break;case 3:Q="Cineon";break;case 4:Q="ACESFilmic";break;case 6:Q="AgX";break;case 7:Q="Neutral";break;case 5:Q="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",J),Q="Linear"}return"vec3 "+$+"( vec3 color ) { return "+Q+"ToneMapping( color ); }"}function a2(){I6.getLuminanceCoefficients(zJ);let $=zJ.x.toFixed(4),J=zJ.y.toFixed(4),Q=zJ.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${$}, ${J}, ${Q} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function r2($){return[$.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",$.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(l5).join(`
`)}function t2($){let J=[];for(let Q in $){let Z=$[Q];if(Z===!1)continue;J.push("#define "+Q+" "+Z)}return J.join(`
`)}function e2($,J){let Q={},Z=$.getProgramParameter(J,$.ACTIVE_ATTRIBUTES);for(let W=0;W<Z;W++){let K=$.getActiveAttrib(J,W),Y=K.name,q=1;if(K.type===$.FLOAT_MAT2)q=2;if(K.type===$.FLOAT_MAT3)q=3;if(K.type===$.FLOAT_MAT4)q=4;Q[Y]={type:K.type,location:$.getAttribLocation(J,Y),locationSize:q}}return Q}function l5($){return $!==""}function r4($,J){let Q=J.numSpotLightShadows+J.numSpotLightMaps-J.numSpotLightShadowsWithMaps;return $.replace(/NUM_DIR_LIGHTS/g,J.numDirLights).replace(/NUM_SPOT_LIGHTS/g,J.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,J.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,Q).replace(/NUM_RECT_AREA_LIGHTS/g,J.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,J.numPointLights).replace(/NUM_HEMI_LIGHTS/g,J.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,J.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,J.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,J.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,J.numPointLightShadows)}function t4($,J){return $.replace(/NUM_CLIPPING_PLANES/g,J.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,J.numClippingPlanes-J.numClipIntersection)}function E1($){return $.replace($H,QH)}function QH($,J){let Q=Y6[J];if(Q===void 0){let Z=JH.get(J);if(Z!==void 0)Q=Y6[Z],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',J,Z);else throw Error("Can not resolve #include <"+J+">")}return E1(Q)}function e4($){return $.replace(ZH,WH)}function WH($,J,Q,Z){let W="";for(let K=parseInt(J);K<parseInt(Q);K++)W+=Z.replace(/\[\s*i\s*\]/g,"[ "+K+" ]").replace(/UNROLLED_LOOP_INDEX/g,K);return W}function $K($){let J=`precision ${$.precision} float;
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
#define LOW_PRECISION`;return J}function KH($){let J="SHADOWMAP_TYPE_BASIC";if($.shadowMapType===1)J="SHADOWMAP_TYPE_PCF";else if($.shadowMapType===2)J="SHADOWMAP_TYPE_PCF_SOFT";else if($.shadowMapType===3)J="SHADOWMAP_TYPE_VSM";return J}function UH($){let J="ENVMAP_TYPE_CUBE";if($.envMap)switch($.envMapMode){case 301:case 302:J="ENVMAP_TYPE_CUBE";break;case 306:J="ENVMAP_TYPE_CUBE_UV";break}return J}function YH($){let J="ENVMAP_MODE_REFLECTION";if($.envMap)switch($.envMapMode){case 302:J="ENVMAP_MODE_REFRACTION";break}return J}function qH($){let J="ENVMAP_BLENDING_NONE";if($.envMap)switch($.combine){case 0:J="ENVMAP_BLENDING_MULTIPLY";break;case 1:J="ENVMAP_BLENDING_MIX";break;case 2:J="ENVMAP_BLENDING_ADD";break}return J}function XH($){let J=$.envMapCubeUVHeight;if(J===null)return null;let Q=Math.log2(J)-2,Z=1/J;return{texelWidth:1/(3*Math.max(Math.pow(2,Q),112)),texelHeight:Z,maxMip:Q}}function GH($,J,Q,Z){let W=$.getContext(),K=Q.defines,Y=Q.vertexShader,q=Q.fragmentShader,G=KH(Q),V=UH(Q),H=YH(Q),N=qH(Q),O=XH(Q),P=r2(Q),D=t2(K),C=W.createProgram(),z,L,T=Q.glslVersion?"#version "+Q.glslVersion+`
`:"";if(Q.isRawShaderMaterial){if(z=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,D].filter(l5).join(`
`),z.length>0)z+=`
`;if(L=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,D].filter(l5).join(`
`),L.length>0)L+=`
`}else z=[$K(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,D,Q.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",Q.batching?"#define USE_BATCHING":"",Q.batchingColor?"#define USE_BATCHING_COLOR":"",Q.instancing?"#define USE_INSTANCING":"",Q.instancingColor?"#define USE_INSTANCING_COLOR":"",Q.instancingMorph?"#define USE_INSTANCING_MORPH":"",Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.map?"#define USE_MAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+H:"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.displacementMap?"#define USE_DISPLACEMENTMAP":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.mapUv?"#define MAP_UV "+Q.mapUv:"",Q.alphaMapUv?"#define ALPHAMAP_UV "+Q.alphaMapUv:"",Q.lightMapUv?"#define LIGHTMAP_UV "+Q.lightMapUv:"",Q.aoMapUv?"#define AOMAP_UV "+Q.aoMapUv:"",Q.emissiveMapUv?"#define EMISSIVEMAP_UV "+Q.emissiveMapUv:"",Q.bumpMapUv?"#define BUMPMAP_UV "+Q.bumpMapUv:"",Q.normalMapUv?"#define NORMALMAP_UV "+Q.normalMapUv:"",Q.displacementMapUv?"#define DISPLACEMENTMAP_UV "+Q.displacementMapUv:"",Q.metalnessMapUv?"#define METALNESSMAP_UV "+Q.metalnessMapUv:"",Q.roughnessMapUv?"#define ROUGHNESSMAP_UV "+Q.roughnessMapUv:"",Q.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+Q.anisotropyMapUv:"",Q.clearcoatMapUv?"#define CLEARCOATMAP_UV "+Q.clearcoatMapUv:"",Q.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+Q.clearcoatNormalMapUv:"",Q.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+Q.clearcoatRoughnessMapUv:"",Q.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+Q.iridescenceMapUv:"",Q.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+Q.iridescenceThicknessMapUv:"",Q.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+Q.sheenColorMapUv:"",Q.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+Q.sheenRoughnessMapUv:"",Q.specularMapUv?"#define SPECULARMAP_UV "+Q.specularMapUv:"",Q.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+Q.specularColorMapUv:"",Q.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+Q.specularIntensityMapUv:"",Q.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+Q.transmissionMapUv:"",Q.thicknessMapUv?"#define THICKNESSMAP_UV "+Q.thicknessMapUv:"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.flatShading?"#define FLAT_SHADED":"",Q.skinning?"#define USE_SKINNING":"",Q.morphTargets?"#define USE_MORPHTARGETS":"",Q.morphNormals&&Q.flatShading===!1?"#define USE_MORPHNORMALS":"",Q.morphColors?"#define USE_MORPHCOLORS":"",Q.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+Q.morphTextureStride:"",Q.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+Q.morphTargetsCount:"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+G:"",Q.sizeAttenuation?"#define USE_SIZEATTENUATION":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",Q.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(l5).join(`
`),L=[$K(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,D,Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",Q.map?"#define USE_MAP":"",Q.matcap?"#define USE_MATCAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+V:"",Q.envMap?"#define "+H:"",Q.envMap?"#define "+N:"",O?"#define CUBEUV_TEXEL_WIDTH "+O.texelWidth:"",O?"#define CUBEUV_TEXEL_HEIGHT "+O.texelHeight:"",O?"#define CUBEUV_MAX_MIP "+O.maxMip+".0":"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoat?"#define USE_CLEARCOAT":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.dispersion?"#define USE_DISPERSION":"",Q.iridescence?"#define USE_IRIDESCENCE":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaTest?"#define USE_ALPHATEST":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.sheen?"#define USE_SHEEN":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors||Q.instancingColor||Q.batchingColor?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.gradientMap?"#define USE_GRADIENTMAP":"",Q.flatShading?"#define FLAT_SHADED":"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+G:"",Q.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",Q.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",Q.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",Q.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",Q.toneMapping!==0?"#define TONE_MAPPING":"",Q.toneMapping!==0?Y6.tonemapping_pars_fragment:"",Q.toneMapping!==0?o2("toneMapping",Q.toneMapping):"",Q.dithering?"#define DITHERING":"",Q.opaque?"#define OPAQUE":"",Y6.colorspace_pars_fragment,s2("linearToOutputTexel",Q.outputColorSpace),a2(),Q.useDepthPacking?"#define DEPTH_PACKING "+Q.depthPacking:"",`
`].filter(l5).join(`
`);if(Y=E1(Y),Y=r4(Y,Q),Y=t4(Y,Q),q=E1(q),q=r4(q,Q),q=t4(q,Q),Y=e4(Y),q=e4(q),Q.isRawShaderMaterial!==!0)T=`#version 300 es
`,z=[P,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+z,L=["#define varying in",Q.glslVersion==="300 es"?"":"layout(location = 0) out highp vec4 pc_fragColor;",Q.glslVersion==="300 es"?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+L;let R=T+z+Y,v=T+L+q,g=s4(W,W.VERTEX_SHADER,R),y=s4(W,W.FRAGMENT_SHADER,v);if(W.attachShader(C,g),W.attachShader(C,y),Q.index0AttributeName!==void 0)W.bindAttribLocation(C,0,Q.index0AttributeName);else if(Q.morphTargets===!0)W.bindAttribLocation(C,0,"position");W.linkProgram(C);function M(h){if($.debug.checkShaderErrors){let l=W.getProgramInfoLog(C)||"",m=W.getShaderInfoLog(g)||"",n=W.getShaderInfoLog(y)||"",o=l.trim(),$0=m.trim(),F0=n.trim(),J0=!0,I0=!0;if(W.getProgramParameter(C,W.LINK_STATUS)===!1)if(J0=!1,typeof $.debug.onShaderError==="function")$.debug.onShaderError(W,C,g,y);else{let y0=a4(W,g,"vertex"),u0=a4(W,y,"fragment");console.error("THREE.WebGLProgram: Shader Error "+W.getError()+" - VALIDATE_STATUS "+W.getProgramParameter(C,W.VALIDATE_STATUS)+`

Material Name: `+h.name+`
Material Type: `+h.type+`

Program Info Log: `+o+`
`+y0+`
`+u0)}else if(o!=="")console.warn("THREE.WebGLProgram: Program Info Log:",o);else if($0===""||F0==="")I0=!1;if(I0)h.diagnostics={runnable:J0,programLog:o,vertexShader:{log:$0,prefix:z},fragmentShader:{log:F0,prefix:L}}}W.deleteShader(g),W.deleteShader(y),p=new c5(W,C),A=e2(W,C)}let p;this.getUniforms=function(){if(p===void 0)M(this);return p};let A;this.getAttributes=function(){if(A===void 0)M(this);return A};let j=Q.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(j===!1)j=W.getProgramParameter(C,d2);return j},this.destroy=function(){Z.releaseStatesOfProgram(this),W.deleteProgram(C),this.program=void 0},this.type=Q.shaderType,this.name=Q.shaderName,this.id=c2++,this.cacheKey=J,this.usedTimes=1,this.program=C,this.vertexShader=g,this.fragmentShader=y,this}class Z3{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update($){let{vertexShader:J,fragmentShader:Q}=$,Z=this._getShaderStage(J),W=this._getShaderStage(Q),K=this._getShaderCacheForMaterial($);if(K.has(Z)===!1)K.add(Z),Z.usedTimes++;if(K.has(W)===!1)K.add(W),W.usedTimes++;return this}remove($){let J=this.materialCache.get($);for(let Q of J)if(Q.usedTimes--,Q.usedTimes===0)this.shaderCache.delete(Q.code);return this.materialCache.delete($),this}getVertexShaderID($){return this._getShaderStage($.vertexShader).id}getFragmentShaderID($){return this._getShaderStage($.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial($){let J=this.materialCache,Q=J.get($);if(Q===void 0)Q=new Set,J.set($,Q);return Q}_getShaderStage($){let J=this.shaderCache,Q=J.get($);if(Q===void 0)Q=new W3($),J.set($,Q);return Q}}class W3{constructor($){this.id=VH++,this.code=$,this.usedTimes=0}}function BH($,J,Q,Z,W,K,Y){let q=new AJ,G=new Z3,V=new Set,H=[],N=W.logarithmicDepthBuffer,O=W.vertexTextures,P=W.precision,D={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function C(A){if(V.add(A),A===0)return"uv";return`uv${A}`}function z(A,j,h,l,m){let n=l.fog,o=m.geometry,$0=A.isMeshStandardMaterial?l.environment:null,F0=(A.isMeshStandardMaterial?Q:J).get(A.envMap||$0),J0=!!F0&&F0.mapping===306?F0.image.height:null,I0=D[A.type];if(A.precision!==null){if(P=W.getMaxPrecision(A.precision),P!==A.precision)console.warn("THREE.WebGLProgram.getParameters:",A.precision,"not supported, using",P,"instead.")}let y0=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u0=y0!==void 0?y0.length:0,t0=0;if(o.morphAttributes.position!==void 0)t0=1;if(o.morphAttributes.normal!==void 0)t0=2;if(o.morphAttributes.color!==void 0)t0=3;let O6,B6,q0,S0;if(I0){let R0=d7[I0];O6=R0.vertexShader,B6=R0.fragmentShader}else O6=A.vertexShader,B6=A.fragmentShader,G.update(A),q0=G.getVertexShaderID(A),S0=G.getFragmentShaderID(A);let A0=$.getRenderTarget(),l0=$.state.buffers.depth.getReversed(),z0=m.isInstancedMesh===!0,e0=m.isBatchedMesh===!0,Q6=!!A.map,x=!!A.matcap,D6=!!F0,s0=!!A.aoMap,o0=!!A.lightMap,g0=!!A.bumpMap,A6=!!A.normalMap,w0=!!A.displacementMap,c0=!!A.emissiveMap,X6=!!A.metalnessMap,C6=!!A.roughnessMap,_6=A.anisotropy>0,_=A.clearcoat>0,E=A.dispersion>0,u=A.iridescence>0,W0=A.sheen>0,B0=A.transmission>0,Q0=_6&&!!A.anisotropyMap,M0=_&&!!A.clearcoatMap,D0=_&&!!A.clearcoatNormalMap,x0=_&&!!A.clearcoatRoughnessMap,a0=u&&!!A.iridescenceMap,P0=u&&!!A.iridescenceThicknessMap,X0=W0&&!!A.sheenColorMap,U0=W0&&!!A.sheenRoughnessMap,H0=!!A.specularMap,T0=!!A.specularColorMap,Z6=!!A.specularIntensityMap,f=B0&&!!A.transmissionMap,j0=B0&&!!A.thicknessMap,E0=!!A.gradientMap,b0=!!A.alphaMap,L0=A.alphaTest>0,Y0=!!A.alphaHash,C0=!!A.extensions,J6=0;if(A.toneMapped){if(A0===null||A0.isXRRenderTarget===!0)J6=$.toneMapping}let L6={shaderID:I0,shaderType:A.type,shaderName:A.name,vertexShader:O6,fragmentShader:B6,defines:A.defines,customVertexShaderID:q0,customFragmentShaderID:S0,isRawShaderMaterial:A.isRawShaderMaterial===!0,glslVersion:A.glslVersion,precision:P,batching:e0,batchingColor:e0&&m._colorsTexture!==null,instancing:z0,instancingColor:z0&&m.instanceColor!==null,instancingMorph:z0&&m.morphTexture!==null,supportsVertexTextures:O,outputColorSpace:A0===null?$.outputColorSpace:A0.isXRRenderTarget===!0?A0.texture.colorSpace:"srgb-linear",alphaToCoverage:!!A.alphaToCoverage,map:Q6,matcap:x,envMap:D6,envMapMode:D6&&F0.mapping,envMapCubeUVHeight:J0,aoMap:s0,lightMap:o0,bumpMap:g0,normalMap:A6,displacementMap:O&&w0,emissiveMap:c0,normalMapObjectSpace:A6&&A.normalMapType===1,normalMapTangentSpace:A6&&A.normalMapType===0,metalnessMap:X6,roughnessMap:C6,anisotropy:_6,anisotropyMap:Q0,clearcoat:_,clearcoatMap:M0,clearcoatNormalMap:D0,clearcoatRoughnessMap:x0,dispersion:E,iridescence:u,iridescenceMap:a0,iridescenceThicknessMap:P0,sheen:W0,sheenColorMap:X0,sheenRoughnessMap:U0,specularMap:H0,specularColorMap:T0,specularIntensityMap:Z6,transmission:B0,transmissionMap:f,thicknessMap:j0,gradientMap:E0,opaque:A.transparent===!1&&A.blending===1&&A.alphaToCoverage===!1,alphaMap:b0,alphaTest:L0,alphaHash:Y0,combine:A.combine,mapUv:Q6&&C(A.map.channel),aoMapUv:s0&&C(A.aoMap.channel),lightMapUv:o0&&C(A.lightMap.channel),bumpMapUv:g0&&C(A.bumpMap.channel),normalMapUv:A6&&C(A.normalMap.channel),displacementMapUv:w0&&C(A.displacementMap.channel),emissiveMapUv:c0&&C(A.emissiveMap.channel),metalnessMapUv:X6&&C(A.metalnessMap.channel),roughnessMapUv:C6&&C(A.roughnessMap.channel),anisotropyMapUv:Q0&&C(A.anisotropyMap.channel),clearcoatMapUv:M0&&C(A.clearcoatMap.channel),clearcoatNormalMapUv:D0&&C(A.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:x0&&C(A.clearcoatRoughnessMap.channel),iridescenceMapUv:a0&&C(A.iridescenceMap.channel),iridescenceThicknessMapUv:P0&&C(A.iridescenceThicknessMap.channel),sheenColorMapUv:X0&&C(A.sheenColorMap.channel),sheenRoughnessMapUv:U0&&C(A.sheenRoughnessMap.channel),specularMapUv:H0&&C(A.specularMap.channel),specularColorMapUv:T0&&C(A.specularColorMap.channel),specularIntensityMapUv:Z6&&C(A.specularIntensityMap.channel),transmissionMapUv:f&&C(A.transmissionMap.channel),thicknessMapUv:j0&&C(A.thicknessMap.channel),alphaMapUv:b0&&C(A.alphaMap.channel),vertexTangents:!!o.attributes.tangent&&(A6||_6),vertexColors:A.vertexColors,vertexAlphas:A.vertexColors===!0&&!!o.attributes.color&&o.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!o.attributes.uv&&(Q6||b0),fog:!!n,useFog:A.fog===!0,fogExp2:!!n&&n.isFogExp2,flatShading:A.flatShading===!0&&A.wireframe===!1,sizeAttenuation:A.sizeAttenuation===!0,logarithmicDepthBuffer:N,reversedDepthBuffer:l0,skinning:m.isSkinnedMesh===!0,morphTargets:o.morphAttributes.position!==void 0,morphNormals:o.morphAttributes.normal!==void 0,morphColors:o.morphAttributes.color!==void 0,morphTargetsCount:u0,morphTextureStride:t0,numDirLights:j.directional.length,numPointLights:j.point.length,numSpotLights:j.spot.length,numSpotLightMaps:j.spotLightMap.length,numRectAreaLights:j.rectArea.length,numHemiLights:j.hemi.length,numDirLightShadows:j.directionalShadowMap.length,numPointLightShadows:j.pointShadowMap.length,numSpotLightShadows:j.spotShadowMap.length,numSpotLightShadowsWithMaps:j.numSpotLightShadowsWithMaps,numLightProbes:j.numLightProbes,numClippingPlanes:Y.numPlanes,numClipIntersection:Y.numIntersection,dithering:A.dithering,shadowMapEnabled:$.shadowMap.enabled&&h.length>0,shadowMapType:$.shadowMap.type,toneMapping:J6,decodeVideoTexture:Q6&&A.map.isVideoTexture===!0&&I6.getTransfer(A.map.colorSpace)==="srgb",decodeVideoTextureEmissive:c0&&A.emissiveMap.isVideoTexture===!0&&I6.getTransfer(A.emissiveMap.colorSpace)==="srgb",premultipliedAlpha:A.premultipliedAlpha,doubleSided:A.side===2,flipSided:A.side===1,useDepthPacking:A.depthPacking>=0,depthPacking:A.depthPacking||0,index0AttributeName:A.index0AttributeName,extensionClipCullDistance:C0&&A.extensions.clipCullDistance===!0&&Z.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(C0&&A.extensions.multiDraw===!0||e0)&&Z.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:Z.has("KHR_parallel_shader_compile"),customProgramCacheKey:A.customProgramCacheKey()};return L6.vertexUv1s=V.has(1),L6.vertexUv2s=V.has(2),L6.vertexUv3s=V.has(3),V.clear(),L6}function L(A){let j=[];if(A.shaderID)j.push(A.shaderID);else j.push(A.customVertexShaderID),j.push(A.customFragmentShaderID);if(A.defines!==void 0)for(let h in A.defines)j.push(h),j.push(A.defines[h]);if(A.isRawShaderMaterial===!1)T(j,A),R(j,A),j.push($.outputColorSpace);return j.push(A.customProgramCacheKey),j.join()}function T(A,j){A.push(j.precision),A.push(j.outputColorSpace),A.push(j.envMapMode),A.push(j.envMapCubeUVHeight),A.push(j.mapUv),A.push(j.alphaMapUv),A.push(j.lightMapUv),A.push(j.aoMapUv),A.push(j.bumpMapUv),A.push(j.normalMapUv),A.push(j.displacementMapUv),A.push(j.emissiveMapUv),A.push(j.metalnessMapUv),A.push(j.roughnessMapUv),A.push(j.anisotropyMapUv),A.push(j.clearcoatMapUv),A.push(j.clearcoatNormalMapUv),A.push(j.clearcoatRoughnessMapUv),A.push(j.iridescenceMapUv),A.push(j.iridescenceThicknessMapUv),A.push(j.sheenColorMapUv),A.push(j.sheenRoughnessMapUv),A.push(j.specularMapUv),A.push(j.specularColorMapUv),A.push(j.specularIntensityMapUv),A.push(j.transmissionMapUv),A.push(j.thicknessMapUv),A.push(j.combine),A.push(j.fogExp2),A.push(j.sizeAttenuation),A.push(j.morphTargetsCount),A.push(j.morphAttributeCount),A.push(j.numDirLights),A.push(j.numPointLights),A.push(j.numSpotLights),A.push(j.numSpotLightMaps),A.push(j.numHemiLights),A.push(j.numRectAreaLights),A.push(j.numDirLightShadows),A.push(j.numPointLightShadows),A.push(j.numSpotLightShadows),A.push(j.numSpotLightShadowsWithMaps),A.push(j.numLightProbes),A.push(j.shadowMapType),A.push(j.toneMapping),A.push(j.numClippingPlanes),A.push(j.numClipIntersection),A.push(j.depthPacking)}function R(A,j){if(q.disableAll(),j.supportsVertexTextures)q.enable(0);if(j.instancing)q.enable(1);if(j.instancingColor)q.enable(2);if(j.instancingMorph)q.enable(3);if(j.matcap)q.enable(4);if(j.envMap)q.enable(5);if(j.normalMapObjectSpace)q.enable(6);if(j.normalMapTangentSpace)q.enable(7);if(j.clearcoat)q.enable(8);if(j.iridescence)q.enable(9);if(j.alphaTest)q.enable(10);if(j.vertexColors)q.enable(11);if(j.vertexAlphas)q.enable(12);if(j.vertexUv1s)q.enable(13);if(j.vertexUv2s)q.enable(14);if(j.vertexUv3s)q.enable(15);if(j.vertexTangents)q.enable(16);if(j.anisotropy)q.enable(17);if(j.alphaHash)q.enable(18);if(j.batching)q.enable(19);if(j.dispersion)q.enable(20);if(j.batchingColor)q.enable(21);if(j.gradientMap)q.enable(22);if(A.push(q.mask),q.disableAll(),j.fog)q.enable(0);if(j.useFog)q.enable(1);if(j.flatShading)q.enable(2);if(j.logarithmicDepthBuffer)q.enable(3);if(j.reversedDepthBuffer)q.enable(4);if(j.skinning)q.enable(5);if(j.morphTargets)q.enable(6);if(j.morphNormals)q.enable(7);if(j.morphColors)q.enable(8);if(j.premultipliedAlpha)q.enable(9);if(j.shadowMapEnabled)q.enable(10);if(j.doubleSided)q.enable(11);if(j.flipSided)q.enable(12);if(j.useDepthPacking)q.enable(13);if(j.dithering)q.enable(14);if(j.transmission)q.enable(15);if(j.sheen)q.enable(16);if(j.opaque)q.enable(17);if(j.pointsUvs)q.enable(18);if(j.decodeVideoTexture)q.enable(19);if(j.decodeVideoTextureEmissive)q.enable(20);if(j.alphaToCoverage)q.enable(21);A.push(q.mask)}function v(A){let j=D[A.type],h;if(j){let l=d7[j];h=hX.clone(l.uniforms)}else h=A.uniforms;return h}function g(A,j){let h;for(let l=0,m=H.length;l<m;l++){let n=H[l];if(n.cacheKey===j){h=n,++h.usedTimes;break}}if(h===void 0)h=new GH($,j,A,K),H.push(h);return h}function y(A){if(--A.usedTimes===0){let j=H.indexOf(A);H[j]=H[H.length-1],H.pop(),A.destroy()}}function M(A){G.remove(A)}function p(){G.dispose()}return{getParameters:z,getProgramCacheKey:L,getUniforms:v,acquireProgram:g,releaseProgram:y,releaseShaderCache:M,programs:H,dispose:p}}function HH(){let $=new WeakMap;function J(Y){return $.has(Y)}function Q(Y){let q=$.get(Y);if(q===void 0)q={},$.set(Y,q);return q}function Z(Y){$.delete(Y)}function W(Y,q,G){$.get(Y)[q]=G}function K(){$=new WeakMap}return{has:J,get:Q,remove:Z,update:W,dispose:K}}function NH($,J){if($.groupOrder!==J.groupOrder)return $.groupOrder-J.groupOrder;else if($.renderOrder!==J.renderOrder)return $.renderOrder-J.renderOrder;else if($.material.id!==J.material.id)return $.material.id-J.material.id;else if($.z!==J.z)return $.z-J.z;else return $.id-J.id}function JK($,J){if($.groupOrder!==J.groupOrder)return $.groupOrder-J.groupOrder;else if($.renderOrder!==J.renderOrder)return $.renderOrder-J.renderOrder;else if($.z!==J.z)return J.z-$.z;else return $.id-J.id}function QK(){let $=[],J=0,Q=[],Z=[],W=[];function K(){J=0,Q.length=0,Z.length=0,W.length=0}function Y(N,O,P,D,C,z){let L=$[J];if(L===void 0)L={id:N.id,object:N,geometry:O,material:P,groupOrder:D,renderOrder:N.renderOrder,z:C,group:z},$[J]=L;else L.id=N.id,L.object=N,L.geometry=O,L.material=P,L.groupOrder=D,L.renderOrder=N.renderOrder,L.z=C,L.group=z;return J++,L}function q(N,O,P,D,C,z){let L=Y(N,O,P,D,C,z);if(P.transmission>0)Z.push(L);else if(P.transparent===!0)W.push(L);else Q.push(L)}function G(N,O,P,D,C,z){let L=Y(N,O,P,D,C,z);if(P.transmission>0)Z.unshift(L);else if(P.transparent===!0)W.unshift(L);else Q.unshift(L)}function V(N,O){if(Q.length>1)Q.sort(N||NH);if(Z.length>1)Z.sort(O||JK);if(W.length>1)W.sort(O||JK)}function H(){for(let N=J,O=$.length;N<O;N++){let P=$[N];if(P.id===null)break;P.id=null,P.object=null,P.geometry=null,P.material=null,P.group=null}}return{opaque:Q,transmissive:Z,transparent:W,init:K,push:q,unshift:G,finish:H,sort:V}}function FH(){let $=new WeakMap;function J(Z,W){let K=$.get(Z),Y;if(K===void 0)Y=new QK,$.set(Z,[Y]);else if(W>=K.length)Y=new QK,K.push(Y);else Y=K[W];return Y}function Q(){$=new WeakMap}return{get:J,dispose:Q}}function OH(){let $={};return{get:function(J){if($[J.id]!==void 0)return $[J.id];let Q;switch(J.type){case"DirectionalLight":Q={direction:new d,color:new U6};break;case"SpotLight":Q={position:new d,direction:new d,color:new U6,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":Q={position:new d,color:new U6,distance:0,decay:0};break;case"HemisphereLight":Q={direction:new d,skyColor:new U6,groundColor:new U6};break;case"RectAreaLight":Q={color:new U6,position:new d,halfWidth:new d,halfHeight:new d};break}return $[J.id]=Q,Q}}}function LH(){let $={};return{get:function(J){if($[J.id]!==void 0)return $[J.id];let Q;switch(J.type){case"DirectionalLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V6};break;case"SpotLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V6};break;case"PointLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V6,shadowCameraNear:1,shadowCameraFar:1000};break}return $[J.id]=Q,Q}}}function zH($,J){return(J.castShadow?2:0)-($.castShadow?2:0)+(J.map?1:0)-($.map?1:0)}function IH($){let J=new OH,Q=LH(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let V=0;V<9;V++)Z.probe.push(new d);let W=new d,K=new q6,Y=new q6;function q(V){let H=0,N=0,O=0;for(let A=0;A<9;A++)Z.probe[A].set(0,0,0);let P=0,D=0,C=0,z=0,L=0,T=0,R=0,v=0,g=0,y=0,M=0;V.sort(zH);for(let A=0,j=V.length;A<j;A++){let h=V[A],l=h.color,m=h.intensity,n=h.distance,o=h.shadow&&h.shadow.map?h.shadow.map.texture:null;if(h.isAmbientLight)H+=l.r*m,N+=l.g*m,O+=l.b*m;else if(h.isLightProbe){for(let $0=0;$0<9;$0++)Z.probe[$0].addScaledVector(h.sh.coefficients[$0],m);M++}else if(h.isDirectionalLight){let $0=J.get(h);if($0.color.copy(h.color).multiplyScalar(h.intensity),h.castShadow){let F0=h.shadow,J0=Q.get(h);J0.shadowIntensity=F0.intensity,J0.shadowBias=F0.bias,J0.shadowNormalBias=F0.normalBias,J0.shadowRadius=F0.radius,J0.shadowMapSize=F0.mapSize,Z.directionalShadow[P]=J0,Z.directionalShadowMap[P]=o,Z.directionalShadowMatrix[P]=h.shadow.matrix,T++}Z.directional[P]=$0,P++}else if(h.isSpotLight){let $0=J.get(h);$0.position.setFromMatrixPosition(h.matrixWorld),$0.color.copy(l).multiplyScalar(m),$0.distance=n,$0.coneCos=Math.cos(h.angle),$0.penumbraCos=Math.cos(h.angle*(1-h.penumbra)),$0.decay=h.decay,Z.spot[C]=$0;let F0=h.shadow;if(h.map){if(Z.spotLightMap[g]=h.map,g++,F0.updateMatrices(h),h.castShadow)y++}if(Z.spotLightMatrix[C]=F0.matrix,h.castShadow){let J0=Q.get(h);J0.shadowIntensity=F0.intensity,J0.shadowBias=F0.bias,J0.shadowNormalBias=F0.normalBias,J0.shadowRadius=F0.radius,J0.shadowMapSize=F0.mapSize,Z.spotShadow[C]=J0,Z.spotShadowMap[C]=o,v++}C++}else if(h.isRectAreaLight){let $0=J.get(h);$0.color.copy(l).multiplyScalar(m),$0.halfWidth.set(h.width*0.5,0,0),$0.halfHeight.set(0,h.height*0.5,0),Z.rectArea[z]=$0,z++}else if(h.isPointLight){let $0=J.get(h);if($0.color.copy(h.color).multiplyScalar(h.intensity),$0.distance=h.distance,$0.decay=h.decay,h.castShadow){let F0=h.shadow,J0=Q.get(h);J0.shadowIntensity=F0.intensity,J0.shadowBias=F0.bias,J0.shadowNormalBias=F0.normalBias,J0.shadowRadius=F0.radius,J0.shadowMapSize=F0.mapSize,J0.shadowCameraNear=F0.camera.near,J0.shadowCameraFar=F0.camera.far,Z.pointShadow[D]=J0,Z.pointShadowMap[D]=o,Z.pointShadowMatrix[D]=h.shadow.matrix,R++}Z.point[D]=$0,D++}else if(h.isHemisphereLight){let $0=J.get(h);$0.skyColor.copy(h.color).multiplyScalar(m),$0.groundColor.copy(h.groundColor).multiplyScalar(m),Z.hemi[L]=$0,L++}}if(z>0)if($.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=_0.LTC_FLOAT_1,Z.rectAreaLTC2=_0.LTC_FLOAT_2;else Z.rectAreaLTC1=_0.LTC_HALF_1,Z.rectAreaLTC2=_0.LTC_HALF_2;Z.ambient[0]=H,Z.ambient[1]=N,Z.ambient[2]=O;let p=Z.hash;if(p.directionalLength!==P||p.pointLength!==D||p.spotLength!==C||p.rectAreaLength!==z||p.hemiLength!==L||p.numDirectionalShadows!==T||p.numPointShadows!==R||p.numSpotShadows!==v||p.numSpotMaps!==g||p.numLightProbes!==M)Z.directional.length=P,Z.spot.length=C,Z.rectArea.length=z,Z.point.length=D,Z.hemi.length=L,Z.directionalShadow.length=T,Z.directionalShadowMap.length=T,Z.pointShadow.length=R,Z.pointShadowMap.length=R,Z.spotShadow.length=v,Z.spotShadowMap.length=v,Z.directionalShadowMatrix.length=T,Z.pointShadowMatrix.length=R,Z.spotLightMatrix.length=v+g-y,Z.spotLightMap.length=g,Z.numSpotLightShadowsWithMaps=y,Z.numLightProbes=M,p.directionalLength=P,p.pointLength=D,p.spotLength=C,p.rectAreaLength=z,p.hemiLength=L,p.numDirectionalShadows=T,p.numPointShadows=R,p.numSpotShadows=v,p.numSpotMaps=g,p.numLightProbes=M,Z.version=PH++}function G(V,H){let N=0,O=0,P=0,D=0,C=0,z=H.matrixWorldInverse;for(let L=0,T=V.length;L<T;L++){let R=V[L];if(R.isDirectionalLight){let v=Z.directional[N];v.direction.setFromMatrixPosition(R.matrixWorld),W.setFromMatrixPosition(R.target.matrixWorld),v.direction.sub(W),v.direction.transformDirection(z),N++}else if(R.isSpotLight){let v=Z.spot[P];v.position.setFromMatrixPosition(R.matrixWorld),v.position.applyMatrix4(z),v.direction.setFromMatrixPosition(R.matrixWorld),W.setFromMatrixPosition(R.target.matrixWorld),v.direction.sub(W),v.direction.transformDirection(z),P++}else if(R.isRectAreaLight){let v=Z.rectArea[D];v.position.setFromMatrixPosition(R.matrixWorld),v.position.applyMatrix4(z),Y.identity(),K.copy(R.matrixWorld),K.premultiply(z),Y.extractRotation(K),v.halfWidth.set(R.width*0.5,0,0),v.halfHeight.set(0,R.height*0.5,0),v.halfWidth.applyMatrix4(Y),v.halfHeight.applyMatrix4(Y),D++}else if(R.isPointLight){let v=Z.point[O];v.position.setFromMatrixPosition(R.matrixWorld),v.position.applyMatrix4(z),O++}else if(R.isHemisphereLight){let v=Z.hemi[C];v.direction.setFromMatrixPosition(R.matrixWorld),v.direction.transformDirection(z),C++}}}return{setup:q,setupView:G,state:Z}}function ZK($){let J=new IH($),Q=[],Z=[];function W(H){V.camera=H,Q.length=0,Z.length=0}function K(H){Q.push(H)}function Y(H){Z.push(H)}function q(){J.setup(Q)}function G(H){J.setupView(Q,H)}let V={lightsArray:Q,shadowsArray:Z,camera:null,lights:J,transmissionRenderTarget:{}};return{init:W,state:V,setupLights:q,setupLightsView:G,pushLight:K,pushShadow:Y}}function DH($){let J=new WeakMap;function Q(W,K=0){let Y=J.get(W),q;if(Y===void 0)q=new ZK($),J.set(W,[q]);else if(K>=Y.length)q=new ZK($),Y.push(q);else q=Y[K];return q}function Z(){J=new WeakMap}return{get:Q,dispose:Z}}function EH($,J,Q){let Z=new wJ,W=new V6,K=new V6,Y=new S6,q=new DK({depthPacking:3201}),G=new CK,V={},H=Q.maxTextureSize,N={[0]:1,[1]:0,[2]:2},O=new n7({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new V6},radius:{value:4}},vertexShader:CH,fragmentShader:RH}),P=O.clone();P.defines.HORIZONTAL_PASS=1;let D=new H7;D.setAttribute("position",new L7(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let C=new O7(D,O),z=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let L=this.type;this.render=function(y,M,p){if(z.enabled===!1)return;if(z.autoUpdate===!1&&z.needsUpdate===!1)return;if(y.length===0)return;let A=$.getRenderTarget(),j=$.getActiveCubeFace(),h=$.getActiveMipmapLevel(),l=$.state;if(l.setBlending(0),l.buffers.depth.getReversed()===!0)l.buffers.color.setClear(0,0,0,0);else l.buffers.color.setClear(1,1,1,1);l.buffers.depth.setTest(!0),l.setScissorTest(!1);let m=L!==3&&this.type===3,n=L===3&&this.type!==3;for(let o=0,$0=y.length;o<$0;o++){let F0=y[o],J0=F0.shadow;if(J0===void 0){console.warn("THREE.WebGLShadowMap:",F0,"has no shadow.");continue}if(J0.autoUpdate===!1&&J0.needsUpdate===!1)continue;W.copy(J0.mapSize);let I0=J0.getFrameExtents();if(W.multiply(I0),K.copy(J0.mapSize),W.x>H||W.y>H){if(W.x>H)K.x=Math.floor(H/I0.x),W.x=K.x*I0.x,J0.mapSize.x=K.x;if(W.y>H)K.y=Math.floor(H/I0.y),W.y=K.y*I0.y,J0.mapSize.y=K.y}if(J0.map===null||m===!0||n===!0){let u0=this.type!==3?{minFilter:1003,magFilter:1003}:{};if(J0.map!==null)J0.map.dispose();J0.map=new G8(W.x,W.y,u0),J0.map.texture.name=F0.name+".shadowMap",J0.camera.updateProjectionMatrix()}$.setRenderTarget(J0.map),$.clear();let y0=J0.getViewportCount();for(let u0=0;u0<y0;u0++){let t0=J0.getViewport(u0);Y.set(K.x*t0.x,K.y*t0.y,K.x*t0.z,K.y*t0.w),l.viewport(Y),J0.updateMatrices(F0,u0),Z=J0.getFrustum(),v(M,p,J0.camera,F0,this.type)}if(J0.isPointLightShadow!==!0&&this.type===3)T(J0,p);J0.needsUpdate=!1}L=this.type,z.needsUpdate=!1,$.setRenderTarget(A,j,h)};function T(y,M){let p=J.update(C);if(O.defines.VSM_SAMPLES!==y.blurSamples)O.defines.VSM_SAMPLES=y.blurSamples,P.defines.VSM_SAMPLES=y.blurSamples,O.needsUpdate=!0,P.needsUpdate=!0;if(y.mapPass===null)y.mapPass=new G8(W.x,W.y);O.uniforms.shadow_pass.value=y.map.texture,O.uniforms.resolution.value=y.mapSize,O.uniforms.radius.value=y.radius,$.setRenderTarget(y.mapPass),$.clear(),$.renderBufferDirect(M,null,p,O,C,null),P.uniforms.shadow_pass.value=y.mapPass.texture,P.uniforms.resolution.value=y.mapSize,P.uniforms.radius.value=y.radius,$.setRenderTarget(y.map),$.clear(),$.renderBufferDirect(M,null,p,P,C,null)}function R(y,M,p,A){let j=null,h=p.isPointLight===!0?y.customDistanceMaterial:y.customDepthMaterial;if(h!==void 0)j=h;else if(j=p.isPointLight===!0?G:q,$.localClippingEnabled&&M.clipShadows===!0&&Array.isArray(M.clippingPlanes)&&M.clippingPlanes.length!==0||M.displacementMap&&M.displacementScale!==0||M.alphaMap&&M.alphaTest>0||M.map&&M.alphaTest>0||M.alphaToCoverage===!0){let l=j.uuid,m=M.uuid,n=V[l];if(n===void 0)n={},V[l]=n;let o=n[m];if(o===void 0)o=j.clone(),n[m]=o,M.addEventListener("dispose",g);j=o}if(j.visible=M.visible,j.wireframe=M.wireframe,A===3)j.side=M.shadowSide!==null?M.shadowSide:M.side;else j.side=M.shadowSide!==null?M.shadowSide:N[M.side];if(j.alphaMap=M.alphaMap,j.alphaTest=M.alphaToCoverage===!0?0.5:M.alphaTest,j.map=M.map,j.clipShadows=M.clipShadows,j.clippingPlanes=M.clippingPlanes,j.clipIntersection=M.clipIntersection,j.displacementMap=M.displacementMap,j.displacementScale=M.displacementScale,j.displacementBias=M.displacementBias,j.wireframeLinewidth=M.wireframeLinewidth,j.linewidth=M.linewidth,p.isPointLight===!0&&j.isMeshDistanceMaterial===!0){let l=$.properties.get(j);l.light=p}return j}function v(y,M,p,A,j){if(y.visible===!1)return;if(y.layers.test(M.layers)&&(y.isMesh||y.isLine||y.isPoints)){if((y.castShadow||y.receiveShadow&&j===3)&&(!y.frustumCulled||Z.intersectsObject(y))){y.modelViewMatrix.multiplyMatrices(p.matrixWorldInverse,y.matrixWorld);let m=J.update(y),n=y.material;if(Array.isArray(n)){let o=m.groups;for(let $0=0,F0=o.length;$0<F0;$0++){let J0=o[$0],I0=n[J0.materialIndex];if(I0&&I0.visible){let y0=R(y,I0,A,j);y.onBeforeShadow($,y,M,p,m,y0,J0),$.renderBufferDirect(p,null,m,y0,y,J0),y.onAfterShadow($,y,M,p,m,y0,J0)}}}else if(n.visible){let o=R(y,n,A,j);y.onBeforeShadow($,y,M,p,m,o,null),$.renderBufferDirect(p,null,m,o,y,null),y.onAfterShadow($,y,M,p,m,o,null)}}}let l=y.children;for(let m=0,n=l.length;m<n;m++)v(l[m],M,p,A,j)}function g(y){y.target.removeEventListener("dispose",g);for(let p in V){let A=V[p],j=y.target.uuid;if(j in A)A[j].dispose(),delete A[j]}}}function AH($,J){function Q(){let f=!1,j0=new S6,E0=null,b0=new S6(0,0,0,0);return{setMask:function(L0){if(E0!==L0&&!f)$.colorMask(L0,L0,L0,L0),E0=L0},setLocked:function(L0){f=L0},setClear:function(L0,Y0,C0,J6,L6){if(L6===!0)L0*=J6,Y0*=J6,C0*=J6;if(j0.set(L0,Y0,C0,J6),b0.equals(j0)===!1)$.clearColor(L0,Y0,C0,J6),b0.copy(j0)},reset:function(){f=!1,E0=null,b0.set(-1,0,0,0)}}}function Z(){let f=!1,j0=!1,E0=null,b0=null,L0=null;return{setReversed:function(Y0){if(j0!==Y0){let C0=J.get("EXT_clip_control");if(Y0)C0.clipControlEXT(C0.LOWER_LEFT_EXT,C0.ZERO_TO_ONE_EXT);else C0.clipControlEXT(C0.LOWER_LEFT_EXT,C0.NEGATIVE_ONE_TO_ONE_EXT);j0=Y0;let J6=L0;L0=null,this.setClear(J6)}},getReversed:function(){return j0},setTest:function(Y0){if(Y0)A0($.DEPTH_TEST);else l0($.DEPTH_TEST)},setMask:function(Y0){if(E0!==Y0&&!f)$.depthMask(Y0),E0=Y0},setFunc:function(Y0){if(j0)Y0=SH[Y0];if(b0!==Y0){switch(Y0){case 0:$.depthFunc($.NEVER);break;case 1:$.depthFunc($.ALWAYS);break;case 2:$.depthFunc($.LESS);break;case 3:$.depthFunc($.LEQUAL);break;case 4:$.depthFunc($.EQUAL);break;case 5:$.depthFunc($.GEQUAL);break;case 6:$.depthFunc($.GREATER);break;case 7:$.depthFunc($.NOTEQUAL);break;default:$.depthFunc($.LEQUAL)}b0=Y0}},setLocked:function(Y0){f=Y0},setClear:function(Y0){if(L0!==Y0){if(j0)Y0=1-Y0;$.clearDepth(Y0),L0=Y0}},reset:function(){f=!1,E0=null,b0=null,L0=null,j0=!1}}}function W(){let f=!1,j0=null,E0=null,b0=null,L0=null,Y0=null,C0=null,J6=null,L6=null;return{setTest:function(R0){if(!f)if(R0)A0($.STENCIL_TEST);else l0($.STENCIL_TEST)},setMask:function(R0){if(j0!==R0&&!f)$.stencilMask(R0),j0=R0},setFunc:function(R0,T6,z7){if(E0!==R0||b0!==T6||L0!==z7)$.stencilFunc(R0,T6,z7),E0=R0,b0=T6,L0=z7},setOp:function(R0,T6,z7){if(Y0!==R0||C0!==T6||J6!==z7)$.stencilOp(R0,T6,z7),Y0=R0,C0=T6,J6=z7},setLocked:function(R0){f=R0},setClear:function(R0){if(L6!==R0)$.clearStencil(R0),L6=R0},reset:function(){f=!1,j0=null,E0=null,b0=null,L0=null,Y0=null,C0=null,J6=null,L6=null}}}let K=new Q,Y=new Z,q=new W,G=new WeakMap,V=new WeakMap,H={},N={},O=new WeakMap,P=[],D=null,C=!1,z=null,L=null,T=null,R=null,v=null,g=null,y=null,M=new U6(0,0,0),p=0,A=!1,j=null,h=null,l=null,m=null,n=null,o=$.getParameter($.MAX_COMBINED_TEXTURE_IMAGE_UNITS),$0=!1,F0=0,J0=$.getParameter($.VERSION);if(J0.indexOf("WebGL")!==-1)F0=parseFloat(/^WebGL (\d)/.exec(J0)[1]),$0=F0>=1;else if(J0.indexOf("OpenGL ES")!==-1)F0=parseFloat(/^OpenGL ES (\d)/.exec(J0)[1]),$0=F0>=2;let I0=null,y0={},u0=$.getParameter($.SCISSOR_BOX),t0=$.getParameter($.VIEWPORT),O6=new S6().fromArray(u0),B6=new S6().fromArray(t0);function q0(f,j0,E0,b0){let L0=new Uint8Array(4),Y0=$.createTexture();$.bindTexture(f,Y0),$.texParameteri(f,$.TEXTURE_MIN_FILTER,$.NEAREST),$.texParameteri(f,$.TEXTURE_MAG_FILTER,$.NEAREST);for(let C0=0;C0<E0;C0++)if(f===$.TEXTURE_3D||f===$.TEXTURE_2D_ARRAY)$.texImage3D(j0,0,$.RGBA,1,1,b0,0,$.RGBA,$.UNSIGNED_BYTE,L0);else $.texImage2D(j0+C0,0,$.RGBA,1,1,0,$.RGBA,$.UNSIGNED_BYTE,L0);return Y0}let S0={};S0[$.TEXTURE_2D]=q0($.TEXTURE_2D,$.TEXTURE_2D,1),S0[$.TEXTURE_CUBE_MAP]=q0($.TEXTURE_CUBE_MAP,$.TEXTURE_CUBE_MAP_POSITIVE_X,6),S0[$.TEXTURE_2D_ARRAY]=q0($.TEXTURE_2D_ARRAY,$.TEXTURE_2D_ARRAY,1,1),S0[$.TEXTURE_3D]=q0($.TEXTURE_3D,$.TEXTURE_3D,1,1),K.setClear(0,0,0,1),Y.setClear(1),q.setClear(0),A0($.DEPTH_TEST),Y.setFunc(3),g0(!1),A6(1),A0($.CULL_FACE),s0(0);function A0(f){if(H[f]!==!0)$.enable(f),H[f]=!0}function l0(f){if(H[f]!==!1)$.disable(f),H[f]=!1}function z0(f,j0){if(N[f]!==j0){if($.bindFramebuffer(f,j0),N[f]=j0,f===$.DRAW_FRAMEBUFFER)N[$.FRAMEBUFFER]=j0;if(f===$.FRAMEBUFFER)N[$.DRAW_FRAMEBUFFER]=j0;return!0}return!1}function e0(f,j0){let E0=P,b0=!1;if(f){if(E0=O.get(j0),E0===void 0)E0=[],O.set(j0,E0);let L0=f.textures;if(E0.length!==L0.length||E0[0]!==$.COLOR_ATTACHMENT0){for(let Y0=0,C0=L0.length;Y0<C0;Y0++)E0[Y0]=$.COLOR_ATTACHMENT0+Y0;E0.length=L0.length,b0=!0}}else if(E0[0]!==$.BACK)E0[0]=$.BACK,b0=!0;if(b0)$.drawBuffers(E0)}function Q6(f){if(D!==f)return $.useProgram(f),D=f,!0;return!1}let x={[100]:$.FUNC_ADD,[101]:$.FUNC_SUBTRACT,[102]:$.FUNC_REVERSE_SUBTRACT};x[103]=$.MIN,x[104]=$.MAX;let D6={[200]:$.ZERO,[201]:$.ONE,[202]:$.SRC_COLOR,[204]:$.SRC_ALPHA,[210]:$.SRC_ALPHA_SATURATE,[208]:$.DST_COLOR,[206]:$.DST_ALPHA,[203]:$.ONE_MINUS_SRC_COLOR,[205]:$.ONE_MINUS_SRC_ALPHA,[209]:$.ONE_MINUS_DST_COLOR,[207]:$.ONE_MINUS_DST_ALPHA,[211]:$.CONSTANT_COLOR,[212]:$.ONE_MINUS_CONSTANT_COLOR,[213]:$.CONSTANT_ALPHA,[214]:$.ONE_MINUS_CONSTANT_ALPHA};function s0(f,j0,E0,b0,L0,Y0,C0,J6,L6,R0){if(f===0){if(C===!0)l0($.BLEND),C=!1;return}if(C===!1)A0($.BLEND),C=!0;if(f!==5){if(f!==z||R0!==A){if(L!==100||v!==100)$.blendEquation($.FUNC_ADD),L=100,v=100;if(R0)switch(f){case 1:$.blendFuncSeparate($.ONE,$.ONE_MINUS_SRC_ALPHA,$.ONE,$.ONE_MINUS_SRC_ALPHA);break;case 2:$.blendFunc($.ONE,$.ONE);break;case 3:$.blendFuncSeparate($.ZERO,$.ONE_MINUS_SRC_COLOR,$.ZERO,$.ONE);break;case 4:$.blendFuncSeparate($.DST_COLOR,$.ONE_MINUS_SRC_ALPHA,$.ZERO,$.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",f);break}else switch(f){case 1:$.blendFuncSeparate($.SRC_ALPHA,$.ONE_MINUS_SRC_ALPHA,$.ONE,$.ONE_MINUS_SRC_ALPHA);break;case 2:$.blendFuncSeparate($.SRC_ALPHA,$.ONE,$.ONE,$.ONE);break;case 3:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case 4:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",f);break}T=null,R=null,g=null,y=null,M.set(0,0,0),p=0,z=f,A=R0}return}if(L0=L0||j0,Y0=Y0||E0,C0=C0||b0,j0!==L||L0!==v)$.blendEquationSeparate(x[j0],x[L0]),L=j0,v=L0;if(E0!==T||b0!==R||Y0!==g||C0!==y)$.blendFuncSeparate(D6[E0],D6[b0],D6[Y0],D6[C0]),T=E0,R=b0,g=Y0,y=C0;if(J6.equals(M)===!1||L6!==p)$.blendColor(J6.r,J6.g,J6.b,L6),M.copy(J6),p=L6;z=f,A=!1}function o0(f,j0){f.side===2?l0($.CULL_FACE):A0($.CULL_FACE);let E0=f.side===1;if(j0)E0=!E0;g0(E0),f.blending===1&&f.transparent===!1?s0(0):s0(f.blending,f.blendEquation,f.blendSrc,f.blendDst,f.blendEquationAlpha,f.blendSrcAlpha,f.blendDstAlpha,f.blendColor,f.blendAlpha,f.premultipliedAlpha),Y.setFunc(f.depthFunc),Y.setTest(f.depthTest),Y.setMask(f.depthWrite),K.setMask(f.colorWrite);let b0=f.stencilWrite;if(q.setTest(b0),b0)q.setMask(f.stencilWriteMask),q.setFunc(f.stencilFunc,f.stencilRef,f.stencilFuncMask),q.setOp(f.stencilFail,f.stencilZFail,f.stencilZPass);c0(f.polygonOffset,f.polygonOffsetFactor,f.polygonOffsetUnits),f.alphaToCoverage===!0?A0($.SAMPLE_ALPHA_TO_COVERAGE):l0($.SAMPLE_ALPHA_TO_COVERAGE)}function g0(f){if(j!==f){if(f)$.frontFace($.CW);else $.frontFace($.CCW);j=f}}function A6(f){if(f!==0){if(A0($.CULL_FACE),f!==h)if(f===1)$.cullFace($.BACK);else if(f===2)$.cullFace($.FRONT);else $.cullFace($.FRONT_AND_BACK)}else l0($.CULL_FACE);h=f}function w0(f){if(f!==l){if($0)$.lineWidth(f);l=f}}function c0(f,j0,E0){if(f){if(A0($.POLYGON_OFFSET_FILL),m!==j0||n!==E0)$.polygonOffset(j0,E0),m=j0,n=E0}else l0($.POLYGON_OFFSET_FILL)}function X6(f){if(f)A0($.SCISSOR_TEST);else l0($.SCISSOR_TEST)}function C6(f){if(f===void 0)f=$.TEXTURE0+o-1;if(I0!==f)$.activeTexture(f),I0=f}function _6(f,j0,E0){if(E0===void 0)if(I0===null)E0=$.TEXTURE0+o-1;else E0=I0;let b0=y0[E0];if(b0===void 0)b0={type:void 0,texture:void 0},y0[E0]=b0;if(b0.type!==f||b0.texture!==j0){if(I0!==E0)$.activeTexture(E0),I0=E0;$.bindTexture(f,j0||S0[f]),b0.type=f,b0.texture=j0}}function _(){let f=y0[I0];if(f!==void 0&&f.type!==void 0)$.bindTexture(f.type,null),f.type=void 0,f.texture=void 0}function E(){try{$.compressedTexImage2D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function u(){try{$.compressedTexImage3D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function W0(){try{$.texSubImage2D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function B0(){try{$.texSubImage3D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function Q0(){try{$.compressedTexSubImage2D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function M0(){try{$.compressedTexSubImage3D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function D0(){try{$.texStorage2D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function x0(){try{$.texStorage3D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function a0(){try{$.texImage2D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function P0(){try{$.texImage3D(...arguments)}catch(f){console.error("THREE.WebGLState:",f)}}function X0(f){if(O6.equals(f)===!1)$.scissor(f.x,f.y,f.z,f.w),O6.copy(f)}function U0(f){if(B6.equals(f)===!1)$.viewport(f.x,f.y,f.z,f.w),B6.copy(f)}function H0(f,j0){let E0=V.get(j0);if(E0===void 0)E0=new WeakMap,V.set(j0,E0);let b0=E0.get(f);if(b0===void 0)b0=$.getUniformBlockIndex(j0,f.name),E0.set(f,b0)}function T0(f,j0){let b0=V.get(j0).get(f);if(G.get(j0)!==b0)$.uniformBlockBinding(j0,b0,f.__bindingPointIndex),G.set(j0,b0)}function Z6(){$.disable($.BLEND),$.disable($.CULL_FACE),$.disable($.DEPTH_TEST),$.disable($.POLYGON_OFFSET_FILL),$.disable($.SCISSOR_TEST),$.disable($.STENCIL_TEST),$.disable($.SAMPLE_ALPHA_TO_COVERAGE),$.blendEquation($.FUNC_ADD),$.blendFunc($.ONE,$.ZERO),$.blendFuncSeparate($.ONE,$.ZERO,$.ONE,$.ZERO),$.blendColor(0,0,0,0),$.colorMask(!0,!0,!0,!0),$.clearColor(0,0,0,0),$.depthMask(!0),$.depthFunc($.LESS),Y.setReversed(!1),$.clearDepth(1),$.stencilMask(4294967295),$.stencilFunc($.ALWAYS,0,4294967295),$.stencilOp($.KEEP,$.KEEP,$.KEEP),$.clearStencil(0),$.cullFace($.BACK),$.frontFace($.CCW),$.polygonOffset(0,0),$.activeTexture($.TEXTURE0),$.bindFramebuffer($.FRAMEBUFFER,null),$.bindFramebuffer($.DRAW_FRAMEBUFFER,null),$.bindFramebuffer($.READ_FRAMEBUFFER,null),$.useProgram(null),$.lineWidth(1),$.scissor(0,0,$.canvas.width,$.canvas.height),$.viewport(0,0,$.canvas.width,$.canvas.height),H={},I0=null,y0={},N={},O=new WeakMap,P=[],D=null,C=!1,z=null,L=null,T=null,R=null,v=null,g=null,y=null,M=new U6(0,0,0),p=0,A=!1,j=null,h=null,l=null,m=null,n=null,O6.set(0,0,$.canvas.width,$.canvas.height),B6.set(0,0,$.canvas.width,$.canvas.height),K.reset(),Y.reset(),q.reset()}return{buffers:{color:K,depth:Y,stencil:q},enable:A0,disable:l0,bindFramebuffer:z0,drawBuffers:e0,useProgram:Q6,setBlending:s0,setMaterial:o0,setFlipSided:g0,setCullFace:A6,setLineWidth:w0,setPolygonOffset:c0,setScissorTest:X6,activeTexture:C6,bindTexture:_6,unbindTexture:_,compressedTexImage2D:E,compressedTexImage3D:u,texImage2D:a0,texImage3D:P0,updateUBOMapping:H0,uniformBlockBinding:T0,texStorage2D:D0,texStorage3D:x0,texSubImage2D:W0,texSubImage3D:B0,compressedTexSubImage2D:Q0,compressedTexSubImage3D:M0,scissor:X0,viewport:U0,reset:Z6}}function jH($,J,Q,Z,W,K,Y){let q=J.has("WEBGL_multisampled_render_to_texture")?J.get("WEBGL_multisampled_render_to_texture"):null,G=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),V=new V6,H=new WeakMap,N,O=new WeakMap,P=!1;try{P=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(_){}function D(_,E){return P?new OffscreenCanvas(_,E):n5("canvas")}function C(_,E,u){let W0=1,B0=_6(_);if(B0.width>u||B0.height>u)W0=u/Math.max(B0.width,B0.height);if(W0<1)if(typeof HTMLImageElement<"u"&&_ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&_ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&_ instanceof ImageBitmap||typeof VideoFrame<"u"&&_ instanceof VideoFrame){let Q0=Math.floor(W0*B0.width),M0=Math.floor(W0*B0.height);if(N===void 0)N=D(Q0,M0);let D0=E?D(Q0,M0):N;return D0.width=Q0,D0.height=M0,D0.getContext("2d").drawImage(_,0,0,Q0,M0),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+B0.width+"x"+B0.height+") to ("+Q0+"x"+M0+")."),D0}else{if("data"in _)console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+B0.width+"x"+B0.height+").");return _}return _}function z(_){return _.generateMipmaps}function L(_){$.generateMipmap(_)}function T(_){if(_.isWebGLCubeRenderTarget)return $.TEXTURE_CUBE_MAP;if(_.isWebGL3DRenderTarget)return $.TEXTURE_3D;if(_.isWebGLArrayRenderTarget||_.isCompressedArrayTexture)return $.TEXTURE_2D_ARRAY;return $.TEXTURE_2D}function R(_,E,u,W0,B0=!1){if(_!==null){if($[_]!==void 0)return $[_];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+_+"'")}let Q0=E;if(E===$.RED){if(u===$.FLOAT)Q0=$.R32F;if(u===$.HALF_FLOAT)Q0=$.R16F;if(u===$.UNSIGNED_BYTE)Q0=$.R8}if(E===$.RED_INTEGER){if(u===$.UNSIGNED_BYTE)Q0=$.R8UI;if(u===$.UNSIGNED_SHORT)Q0=$.R16UI;if(u===$.UNSIGNED_INT)Q0=$.R32UI;if(u===$.BYTE)Q0=$.R8I;if(u===$.SHORT)Q0=$.R16I;if(u===$.INT)Q0=$.R32I}if(E===$.RG){if(u===$.FLOAT)Q0=$.RG32F;if(u===$.HALF_FLOAT)Q0=$.RG16F;if(u===$.UNSIGNED_BYTE)Q0=$.RG8}if(E===$.RG_INTEGER){if(u===$.UNSIGNED_BYTE)Q0=$.RG8UI;if(u===$.UNSIGNED_SHORT)Q0=$.RG16UI;if(u===$.UNSIGNED_INT)Q0=$.RG32UI;if(u===$.BYTE)Q0=$.RG8I;if(u===$.SHORT)Q0=$.RG16I;if(u===$.INT)Q0=$.RG32I}if(E===$.RGB_INTEGER){if(u===$.UNSIGNED_BYTE)Q0=$.RGB8UI;if(u===$.UNSIGNED_SHORT)Q0=$.RGB16UI;if(u===$.UNSIGNED_INT)Q0=$.RGB32UI;if(u===$.BYTE)Q0=$.RGB8I;if(u===$.SHORT)Q0=$.RGB16I;if(u===$.INT)Q0=$.RGB32I}if(E===$.RGBA_INTEGER){if(u===$.UNSIGNED_BYTE)Q0=$.RGBA8UI;if(u===$.UNSIGNED_SHORT)Q0=$.RGBA16UI;if(u===$.UNSIGNED_INT)Q0=$.RGBA32UI;if(u===$.BYTE)Q0=$.RGBA8I;if(u===$.SHORT)Q0=$.RGBA16I;if(u===$.INT)Q0=$.RGBA32I}if(E===$.RGB){if(u===$.UNSIGNED_INT_5_9_9_9_REV)Q0=$.RGB9_E5;if(u===$.UNSIGNED_INT_10F_11F_11F_REV)Q0=$.R11F_G11F_B10F}if(E===$.RGBA){let M0=B0?"linear":I6.getTransfer(W0);if(u===$.FLOAT)Q0=$.RGBA32F;if(u===$.HALF_FLOAT)Q0=$.RGBA16F;if(u===$.UNSIGNED_BYTE)Q0=M0==="srgb"?$.SRGB8_ALPHA8:$.RGBA8;if(u===$.UNSIGNED_SHORT_4_4_4_4)Q0=$.RGBA4;if(u===$.UNSIGNED_SHORT_5_5_5_1)Q0=$.RGB5_A1}if(Q0===$.R16F||Q0===$.R32F||Q0===$.RG16F||Q0===$.RG32F||Q0===$.RGBA16F||Q0===$.RGBA32F)J.get("EXT_color_buffer_float");return Q0}function v(_,E){let u;if(_){if(E===null||E===1014||E===1020)u=$.DEPTH24_STENCIL8;else if(E===1015)u=$.DEPTH32F_STENCIL8;else if(E===1012)u=$.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(E===null||E===1014||E===1020)u=$.DEPTH_COMPONENT24;else if(E===1015)u=$.DEPTH_COMPONENT32F;else if(E===1012)u=$.DEPTH_COMPONENT16;return u}function g(_,E){if(z(_)===!0||_.isFramebufferTexture&&_.minFilter!==1003&&_.minFilter!==1006)return Math.log2(Math.max(E.width,E.height))+1;else if(_.mipmaps!==void 0&&_.mipmaps.length>0)return _.mipmaps.length;else if(_.isCompressedTexture&&Array.isArray(_.image))return E.mipmaps.length;else return 1}function y(_){let E=_.target;if(E.removeEventListener("dispose",y),p(E),E.isVideoTexture)H.delete(E)}function M(_){let E=_.target;E.removeEventListener("dispose",M),j(E)}function p(_){let E=Z.get(_);if(E.__webglInit===void 0)return;let u=_.source,W0=O.get(u);if(W0){let B0=W0[E.__cacheKey];if(B0.usedTimes--,B0.usedTimes===0)A(_);if(Object.keys(W0).length===0)O.delete(u)}Z.remove(_)}function A(_){let E=Z.get(_);$.deleteTexture(E.__webglTexture);let u=_.source,W0=O.get(u);delete W0[E.__cacheKey],Y.memory.textures--}function j(_){let E=Z.get(_);if(_.depthTexture)_.depthTexture.dispose(),Z.remove(_.depthTexture);if(_.isWebGLCubeRenderTarget)for(let W0=0;W0<6;W0++){if(Array.isArray(E.__webglFramebuffer[W0]))for(let B0=0;B0<E.__webglFramebuffer[W0].length;B0++)$.deleteFramebuffer(E.__webglFramebuffer[W0][B0]);else $.deleteFramebuffer(E.__webglFramebuffer[W0]);if(E.__webglDepthbuffer)$.deleteRenderbuffer(E.__webglDepthbuffer[W0])}else{if(Array.isArray(E.__webglFramebuffer))for(let W0=0;W0<E.__webglFramebuffer.length;W0++)$.deleteFramebuffer(E.__webglFramebuffer[W0]);else $.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer)$.deleteRenderbuffer(E.__webglDepthbuffer);if(E.__webglMultisampledFramebuffer)$.deleteFramebuffer(E.__webglMultisampledFramebuffer);if(E.__webglColorRenderbuffer){for(let W0=0;W0<E.__webglColorRenderbuffer.length;W0++)if(E.__webglColorRenderbuffer[W0])$.deleteRenderbuffer(E.__webglColorRenderbuffer[W0])}if(E.__webglDepthRenderbuffer)$.deleteRenderbuffer(E.__webglDepthRenderbuffer)}let u=_.textures;for(let W0=0,B0=u.length;W0<B0;W0++){let Q0=Z.get(u[W0]);if(Q0.__webglTexture)$.deleteTexture(Q0.__webglTexture),Y.memory.textures--;Z.remove(u[W0])}Z.remove(_)}let h=0;function l(){h=0}function m(){let _=h;if(_>=W.maxTextures)console.warn("THREE.WebGLTextures: Trying to use "+_+" texture units while this GPU supports only "+W.maxTextures);return h+=1,_}function n(_){let E=[];return E.push(_.wrapS),E.push(_.wrapT),E.push(_.wrapR||0),E.push(_.magFilter),E.push(_.minFilter),E.push(_.anisotropy),E.push(_.internalFormat),E.push(_.format),E.push(_.type),E.push(_.generateMipmaps),E.push(_.premultiplyAlpha),E.push(_.flipY),E.push(_.unpackAlignment),E.push(_.colorSpace),E.join()}function o(_,E){let u=Z.get(_);if(_.isVideoTexture)X6(_);if(_.isRenderTargetTexture===!1&&_.isExternalTexture!==!0&&_.version>0&&u.__version!==_.version){let W0=_.image;if(W0===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(W0.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{S0(u,_,E);return}}else if(_.isExternalTexture)u.__webglTexture=_.sourceTexture?_.sourceTexture:null;Q.bindTexture($.TEXTURE_2D,u.__webglTexture,$.TEXTURE0+E)}function $0(_,E){let u=Z.get(_);if(_.isRenderTargetTexture===!1&&_.version>0&&u.__version!==_.version){S0(u,_,E);return}Q.bindTexture($.TEXTURE_2D_ARRAY,u.__webglTexture,$.TEXTURE0+E)}function F0(_,E){let u=Z.get(_);if(_.isRenderTargetTexture===!1&&_.version>0&&u.__version!==_.version){S0(u,_,E);return}Q.bindTexture($.TEXTURE_3D,u.__webglTexture,$.TEXTURE0+E)}function J0(_,E){let u=Z.get(_);if(_.version>0&&u.__version!==_.version){A0(u,_,E);return}Q.bindTexture($.TEXTURE_CUBE_MAP,u.__webglTexture,$.TEXTURE0+E)}let I0={[1000]:$.REPEAT,[1001]:$.CLAMP_TO_EDGE,[1002]:$.MIRRORED_REPEAT},y0={[1003]:$.NEAREST,[1004]:$.NEAREST_MIPMAP_NEAREST,[1005]:$.NEAREST_MIPMAP_LINEAR,[1006]:$.LINEAR,[1007]:$.LINEAR_MIPMAP_NEAREST,[1008]:$.LINEAR_MIPMAP_LINEAR},u0={[512]:$.NEVER,[519]:$.ALWAYS,[513]:$.LESS,[515]:$.LEQUAL,[514]:$.EQUAL,[518]:$.GEQUAL,[516]:$.GREATER,[517]:$.NOTEQUAL};function t0(_,E){if(E.type===1015&&J.has("OES_texture_float_linear")===!1&&(E.magFilter===1006||E.magFilter===1007||E.magFilter===1005||E.magFilter===1008||E.minFilter===1006||E.minFilter===1007||E.minFilter===1005||E.minFilter===1008))console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if($.texParameteri(_,$.TEXTURE_WRAP_S,I0[E.wrapS]),$.texParameteri(_,$.TEXTURE_WRAP_T,I0[E.wrapT]),_===$.TEXTURE_3D||_===$.TEXTURE_2D_ARRAY)$.texParameteri(_,$.TEXTURE_WRAP_R,I0[E.wrapR]);if($.texParameteri(_,$.TEXTURE_MAG_FILTER,y0[E.magFilter]),$.texParameteri(_,$.TEXTURE_MIN_FILTER,y0[E.minFilter]),E.compareFunction)$.texParameteri(_,$.TEXTURE_COMPARE_MODE,$.COMPARE_REF_TO_TEXTURE),$.texParameteri(_,$.TEXTURE_COMPARE_FUNC,u0[E.compareFunction]);if(J.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===1003)return;if(E.minFilter!==1005&&E.minFilter!==1008)return;if(E.type===1015&&J.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||Z.get(E).__currentAnisotropy){let u=J.get("EXT_texture_filter_anisotropic");$.texParameterf(_,u.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,W.getMaxAnisotropy())),Z.get(E).__currentAnisotropy=E.anisotropy}}}function O6(_,E){let u=!1;if(_.__webglInit===void 0)_.__webglInit=!0,E.addEventListener("dispose",y);let W0=E.source,B0=O.get(W0);if(B0===void 0)B0={},O.set(W0,B0);let Q0=n(E);if(Q0!==_.__cacheKey){if(B0[Q0]===void 0)B0[Q0]={texture:$.createTexture(),usedTimes:0},Y.memory.textures++,u=!0;B0[Q0].usedTimes++;let M0=B0[_.__cacheKey];if(M0!==void 0){if(B0[_.__cacheKey].usedTimes--,M0.usedTimes===0)A(E)}_.__cacheKey=Q0,_.__webglTexture=B0[Q0].texture}return u}function B6(_,E,u){return Math.floor(Math.floor(_/u)/E)}function q0(_,E,u,W0){let Q0=_.updateRanges;if(Q0.length===0)Q.texSubImage2D($.TEXTURE_2D,0,0,0,E.width,E.height,u,W0,E.data);else{Q0.sort((P0,X0)=>P0.start-X0.start);let M0=0;for(let P0=1;P0<Q0.length;P0++){let X0=Q0[M0],U0=Q0[P0],H0=X0.start+X0.count,T0=B6(U0.start,E.width,4),Z6=B6(X0.start,E.width,4);if(U0.start<=H0+1&&T0===Z6&&B6(U0.start+U0.count-1,E.width,4)===T0)X0.count=Math.max(X0.count,U0.start+U0.count-X0.start);else++M0,Q0[M0]=U0}Q0.length=M0+1;let D0=$.getParameter($.UNPACK_ROW_LENGTH),x0=$.getParameter($.UNPACK_SKIP_PIXELS),a0=$.getParameter($.UNPACK_SKIP_ROWS);$.pixelStorei($.UNPACK_ROW_LENGTH,E.width);for(let P0=0,X0=Q0.length;P0<X0;P0++){let U0=Q0[P0],H0=Math.floor(U0.start/4),T0=Math.ceil(U0.count/4),Z6=H0%E.width,f=Math.floor(H0/E.width),j0=T0,E0=1;$.pixelStorei($.UNPACK_SKIP_PIXELS,Z6),$.pixelStorei($.UNPACK_SKIP_ROWS,f),Q.texSubImage2D($.TEXTURE_2D,0,Z6,f,j0,1,u,W0,E.data)}_.clearUpdateRanges(),$.pixelStorei($.UNPACK_ROW_LENGTH,D0),$.pixelStorei($.UNPACK_SKIP_PIXELS,x0),$.pixelStorei($.UNPACK_SKIP_ROWS,a0)}}function S0(_,E,u){let W0=$.TEXTURE_2D;if(E.isDataArrayTexture||E.isCompressedArrayTexture)W0=$.TEXTURE_2D_ARRAY;if(E.isData3DTexture)W0=$.TEXTURE_3D;let B0=O6(_,E),Q0=E.source;Q.bindTexture(W0,_.__webglTexture,$.TEXTURE0+u);let M0=Z.get(Q0);if(Q0.version!==M0.__version||B0===!0){Q.activeTexture($.TEXTURE0+u);let D0=I6.getPrimaries(I6.workingColorSpace),x0=E.colorSpace===""?null:I6.getPrimaries(E.colorSpace),a0=E.colorSpace===""||D0===x0?$.NONE:$.BROWSER_DEFAULT_WEBGL;$.pixelStorei($.UNPACK_FLIP_Y_WEBGL,E.flipY),$.pixelStorei($.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),$.pixelStorei($.UNPACK_ALIGNMENT,E.unpackAlignment),$.pixelStorei($.UNPACK_COLORSPACE_CONVERSION_WEBGL,a0);let P0=C(E.image,!1,W.maxTextureSize);P0=C6(E,P0);let X0=K.convert(E.format,E.colorSpace),U0=K.convert(E.type),H0=R(E.internalFormat,X0,U0,E.colorSpace,E.isVideoTexture);t0(W0,E);let T0,Z6=E.mipmaps,f=E.isVideoTexture!==!0,j0=M0.__version===void 0||B0===!0,E0=Q0.dataReady,b0=g(E,P0);if(E.isDepthTexture){if(H0=v(E.format===1027,E.type),j0)if(f)Q.texStorage2D($.TEXTURE_2D,1,H0,P0.width,P0.height);else Q.texImage2D($.TEXTURE_2D,0,H0,P0.width,P0.height,0,X0,U0,null)}else if(E.isDataTexture)if(Z6.length>0){if(f&&j0)Q.texStorage2D($.TEXTURE_2D,b0,H0,Z6[0].width,Z6[0].height);for(let L0=0,Y0=Z6.length;L0<Y0;L0++)if(T0=Z6[L0],f){if(E0)Q.texSubImage2D($.TEXTURE_2D,L0,0,0,T0.width,T0.height,X0,U0,T0.data)}else Q.texImage2D($.TEXTURE_2D,L0,H0,T0.width,T0.height,0,X0,U0,T0.data);E.generateMipmaps=!1}else if(f){if(j0)Q.texStorage2D($.TEXTURE_2D,b0,H0,P0.width,P0.height);if(E0)q0(E,P0,X0,U0)}else Q.texImage2D($.TEXTURE_2D,0,H0,P0.width,P0.height,0,X0,U0,P0.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){if(f&&j0)Q.texStorage3D($.TEXTURE_2D_ARRAY,b0,H0,Z6[0].width,Z6[0].height,P0.depth);for(let L0=0,Y0=Z6.length;L0<Y0;L0++)if(T0=Z6[L0],E.format!==1023)if(X0!==null)if(f){if(E0)if(E.layerUpdates.size>0){let C0=y4(T0.width,T0.height,E.format,E.type);for(let J6 of E.layerUpdates){let L6=T0.data.subarray(J6*C0/T0.data.BYTES_PER_ELEMENT,(J6+1)*C0/T0.data.BYTES_PER_ELEMENT);Q.compressedTexSubImage3D($.TEXTURE_2D_ARRAY,L0,0,0,J6,T0.width,T0.height,1,X0,L6)}E.clearLayerUpdates()}else Q.compressedTexSubImage3D($.TEXTURE_2D_ARRAY,L0,0,0,0,T0.width,T0.height,P0.depth,X0,T0.data)}else Q.compressedTexImage3D($.TEXTURE_2D_ARRAY,L0,H0,T0.width,T0.height,P0.depth,0,T0.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(f){if(E0)Q.texSubImage3D($.TEXTURE_2D_ARRAY,L0,0,0,0,T0.width,T0.height,P0.depth,X0,U0,T0.data)}else Q.texImage3D($.TEXTURE_2D_ARRAY,L0,H0,T0.width,T0.height,P0.depth,0,X0,U0,T0.data)}else{if(f&&j0)Q.texStorage2D($.TEXTURE_2D,b0,H0,Z6[0].width,Z6[0].height);for(let L0=0,Y0=Z6.length;L0<Y0;L0++)if(T0=Z6[L0],E.format!==1023)if(X0!==null)if(f){if(E0)Q.compressedTexSubImage2D($.TEXTURE_2D,L0,0,0,T0.width,T0.height,X0,T0.data)}else Q.compressedTexImage2D($.TEXTURE_2D,L0,H0,T0.width,T0.height,0,T0.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(f){if(E0)Q.texSubImage2D($.TEXTURE_2D,L0,0,0,T0.width,T0.height,X0,U0,T0.data)}else Q.texImage2D($.TEXTURE_2D,L0,H0,T0.width,T0.height,0,X0,U0,T0.data)}else if(E.isDataArrayTexture)if(f){if(j0)Q.texStorage3D($.TEXTURE_2D_ARRAY,b0,H0,P0.width,P0.height,P0.depth);if(E0)if(E.layerUpdates.size>0){let L0=y4(P0.width,P0.height,E.format,E.type);for(let Y0 of E.layerUpdates){let C0=P0.data.subarray(Y0*L0/P0.data.BYTES_PER_ELEMENT,(Y0+1)*L0/P0.data.BYTES_PER_ELEMENT);Q.texSubImage3D($.TEXTURE_2D_ARRAY,0,0,0,Y0,P0.width,P0.height,1,X0,U0,C0)}E.clearLayerUpdates()}else Q.texSubImage3D($.TEXTURE_2D_ARRAY,0,0,0,0,P0.width,P0.height,P0.depth,X0,U0,P0.data)}else Q.texImage3D($.TEXTURE_2D_ARRAY,0,H0,P0.width,P0.height,P0.depth,0,X0,U0,P0.data);else if(E.isData3DTexture)if(f){if(j0)Q.texStorage3D($.TEXTURE_3D,b0,H0,P0.width,P0.height,P0.depth);if(E0)Q.texSubImage3D($.TEXTURE_3D,0,0,0,0,P0.width,P0.height,P0.depth,X0,U0,P0.data)}else Q.texImage3D($.TEXTURE_3D,0,H0,P0.width,P0.height,P0.depth,0,X0,U0,P0.data);else if(E.isFramebufferTexture){if(j0)if(f)Q.texStorage2D($.TEXTURE_2D,b0,H0,P0.width,P0.height);else{let{width:L0,height:Y0}=P0;for(let C0=0;C0<b0;C0++)Q.texImage2D($.TEXTURE_2D,C0,H0,L0,Y0,0,X0,U0,null),L0>>=1,Y0>>=1}}else if(Z6.length>0){if(f&&j0){let L0=_6(Z6[0]);Q.texStorage2D($.TEXTURE_2D,b0,H0,L0.width,L0.height)}for(let L0=0,Y0=Z6.length;L0<Y0;L0++)if(T0=Z6[L0],f){if(E0)Q.texSubImage2D($.TEXTURE_2D,L0,0,0,X0,U0,T0)}else Q.texImage2D($.TEXTURE_2D,L0,H0,X0,U0,T0);E.generateMipmaps=!1}else if(f){if(j0){let L0=_6(P0);Q.texStorage2D($.TEXTURE_2D,b0,H0,L0.width,L0.height)}if(E0)Q.texSubImage2D($.TEXTURE_2D,0,0,0,X0,U0,P0)}else Q.texImage2D($.TEXTURE_2D,0,H0,X0,U0,P0);if(z(E))L(W0);if(M0.__version=Q0.version,E.onUpdate)E.onUpdate(E)}_.__version=E.version}function A0(_,E,u){if(E.image.length!==6)return;let W0=O6(_,E),B0=E.source;Q.bindTexture($.TEXTURE_CUBE_MAP,_.__webglTexture,$.TEXTURE0+u);let Q0=Z.get(B0);if(B0.version!==Q0.__version||W0===!0){Q.activeTexture($.TEXTURE0+u);let M0=I6.getPrimaries(I6.workingColorSpace),D0=E.colorSpace===""?null:I6.getPrimaries(E.colorSpace),x0=E.colorSpace===""||M0===D0?$.NONE:$.BROWSER_DEFAULT_WEBGL;$.pixelStorei($.UNPACK_FLIP_Y_WEBGL,E.flipY),$.pixelStorei($.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),$.pixelStorei($.UNPACK_ALIGNMENT,E.unpackAlignment),$.pixelStorei($.UNPACK_COLORSPACE_CONVERSION_WEBGL,x0);let a0=E.isCompressedTexture||E.image[0].isCompressedTexture,P0=E.image[0]&&E.image[0].isDataTexture,X0=[];for(let Y0=0;Y0<6;Y0++){if(!a0&&!P0)X0[Y0]=C(E.image[Y0],!0,W.maxCubemapSize);else X0[Y0]=P0?E.image[Y0].image:E.image[Y0];X0[Y0]=C6(E,X0[Y0])}let U0=X0[0],H0=K.convert(E.format,E.colorSpace),T0=K.convert(E.type),Z6=R(E.internalFormat,H0,T0,E.colorSpace),f=E.isVideoTexture!==!0,j0=Q0.__version===void 0||W0===!0,E0=B0.dataReady,b0=g(E,U0);t0($.TEXTURE_CUBE_MAP,E);let L0;if(a0){if(f&&j0)Q.texStorage2D($.TEXTURE_CUBE_MAP,b0,Z6,U0.width,U0.height);for(let Y0=0;Y0<6;Y0++){L0=X0[Y0].mipmaps;for(let C0=0;C0<L0.length;C0++){let J6=L0[C0];if(E.format!==1023)if(H0!==null)if(f){if(E0)Q.compressedTexSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0,0,0,J6.width,J6.height,H0,J6.data)}else Q.compressedTexImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0,Z6,J6.width,J6.height,0,J6.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(f){if(E0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0,0,0,J6.width,J6.height,H0,T0,J6.data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0,Z6,J6.width,J6.height,0,H0,T0,J6.data)}}}else{if(L0=E.mipmaps,f&&j0){if(L0.length>0)b0++;let Y0=_6(X0[0]);Q.texStorage2D($.TEXTURE_CUBE_MAP,b0,Z6,Y0.width,Y0.height)}for(let Y0=0;Y0<6;Y0++)if(P0){if(f){if(E0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,0,0,0,X0[Y0].width,X0[Y0].height,H0,T0,X0[Y0].data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,0,Z6,X0[Y0].width,X0[Y0].height,0,H0,T0,X0[Y0].data);for(let C0=0;C0<L0.length;C0++){let L6=L0[C0].image[Y0].image;if(f){if(E0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0+1,0,0,L6.width,L6.height,H0,T0,L6.data)}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0+1,Z6,L6.width,L6.height,0,H0,T0,L6.data)}}else{if(f){if(E0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,0,0,0,H0,T0,X0[Y0])}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,0,Z6,H0,T0,X0[Y0]);for(let C0=0;C0<L0.length;C0++){let J6=L0[C0];if(f){if(E0)Q.texSubImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0+1,0,0,H0,T0,J6.image[Y0])}else Q.texImage2D($.TEXTURE_CUBE_MAP_POSITIVE_X+Y0,C0+1,Z6,H0,T0,J6.image[Y0])}}}if(z(E))L($.TEXTURE_CUBE_MAP);if(Q0.__version=B0.version,E.onUpdate)E.onUpdate(E)}_.__version=E.version}function l0(_,E,u,W0,B0,Q0){let M0=K.convert(u.format,u.colorSpace),D0=K.convert(u.type),x0=R(u.internalFormat,M0,D0,u.colorSpace),a0=Z.get(E),P0=Z.get(u);if(P0.__renderTarget=E,!a0.__hasExternalTextures){let X0=Math.max(1,E.width>>Q0),U0=Math.max(1,E.height>>Q0);if(B0===$.TEXTURE_3D||B0===$.TEXTURE_2D_ARRAY)Q.texImage3D(B0,Q0,x0,X0,U0,E.depth,0,M0,D0,null);else Q.texImage2D(B0,Q0,x0,X0,U0,0,M0,D0,null)}if(Q.bindFramebuffer($.FRAMEBUFFER,_),c0(E))q.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,W0,B0,P0.__webglTexture,0,w0(E));else if(B0===$.TEXTURE_2D||B0>=$.TEXTURE_CUBE_MAP_POSITIVE_X&&B0<=$.TEXTURE_CUBE_MAP_NEGATIVE_Z)$.framebufferTexture2D($.FRAMEBUFFER,W0,B0,P0.__webglTexture,Q0);Q.bindFramebuffer($.FRAMEBUFFER,null)}function z0(_,E,u){if($.bindRenderbuffer($.RENDERBUFFER,_),E.depthBuffer){let W0=E.depthTexture,B0=W0&&W0.isDepthTexture?W0.type:null,Q0=v(E.stencilBuffer,B0),M0=E.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,D0=w0(E);if(c0(E))q.renderbufferStorageMultisampleEXT($.RENDERBUFFER,D0,Q0,E.width,E.height);else if(u)$.renderbufferStorageMultisample($.RENDERBUFFER,D0,Q0,E.width,E.height);else $.renderbufferStorage($.RENDERBUFFER,Q0,E.width,E.height);$.framebufferRenderbuffer($.FRAMEBUFFER,M0,$.RENDERBUFFER,_)}else{let W0=E.textures;for(let B0=0;B0<W0.length;B0++){let Q0=W0[B0],M0=K.convert(Q0.format,Q0.colorSpace),D0=K.convert(Q0.type),x0=R(Q0.internalFormat,M0,D0,Q0.colorSpace),a0=w0(E);if(u&&c0(E)===!1)$.renderbufferStorageMultisample($.RENDERBUFFER,a0,x0,E.width,E.height);else if(c0(E))q.renderbufferStorageMultisampleEXT($.RENDERBUFFER,a0,x0,E.width,E.height);else $.renderbufferStorage($.RENDERBUFFER,x0,E.width,E.height)}}$.bindRenderbuffer($.RENDERBUFFER,null)}function e0(_,E){if(E&&E.isWebGLCubeRenderTarget)throw Error("Depth Texture with cube render targets is not supported");if(Q.bindFramebuffer($.FRAMEBUFFER,_),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let W0=Z.get(E.depthTexture);if(W0.__renderTarget=E,!W0.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0;o(E.depthTexture,0);let B0=W0.__webglTexture,Q0=w0(E);if(E.depthTexture.format===1026)if(c0(E))q.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,$.DEPTH_ATTACHMENT,$.TEXTURE_2D,B0,0,Q0);else $.framebufferTexture2D($.FRAMEBUFFER,$.DEPTH_ATTACHMENT,$.TEXTURE_2D,B0,0);else if(E.depthTexture.format===1027)if(c0(E))q.framebufferTexture2DMultisampleEXT($.FRAMEBUFFER,$.DEPTH_STENCIL_ATTACHMENT,$.TEXTURE_2D,B0,0,Q0);else $.framebufferTexture2D($.FRAMEBUFFER,$.DEPTH_STENCIL_ATTACHMENT,$.TEXTURE_2D,B0,0);else throw Error("Unknown depthTexture format")}function Q6(_){let E=Z.get(_),u=_.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==_.depthTexture){let W0=_.depthTexture;if(E.__depthDisposeCallback)E.__depthDisposeCallback();if(W0){let B0=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,W0.removeEventListener("dispose",B0)};W0.addEventListener("dispose",B0),E.__depthDisposeCallback=B0}E.__boundDepthTexture=W0}if(_.depthTexture&&!E.__autoAllocateDepthBuffer){if(u)throw Error("target.depthTexture not supported in Cube render targets");let W0=_.texture.mipmaps;if(W0&&W0.length>0)e0(E.__webglFramebuffer[0],_);else e0(E.__webglFramebuffer,_)}else if(u){E.__webglDepthbuffer=[];for(let W0=0;W0<6;W0++)if(Q.bindFramebuffer($.FRAMEBUFFER,E.__webglFramebuffer[W0]),E.__webglDepthbuffer[W0]===void 0)E.__webglDepthbuffer[W0]=$.createRenderbuffer(),z0(E.__webglDepthbuffer[W0],_,!1);else{let B0=_.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,Q0=E.__webglDepthbuffer[W0];$.bindRenderbuffer($.RENDERBUFFER,Q0),$.framebufferRenderbuffer($.FRAMEBUFFER,B0,$.RENDERBUFFER,Q0)}}else{let W0=_.texture.mipmaps;if(W0&&W0.length>0)Q.bindFramebuffer($.FRAMEBUFFER,E.__webglFramebuffer[0]);else Q.bindFramebuffer($.FRAMEBUFFER,E.__webglFramebuffer);if(E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=$.createRenderbuffer(),z0(E.__webglDepthbuffer,_,!1);else{let B0=_.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,Q0=E.__webglDepthbuffer;$.bindRenderbuffer($.RENDERBUFFER,Q0),$.framebufferRenderbuffer($.FRAMEBUFFER,B0,$.RENDERBUFFER,Q0)}}Q.bindFramebuffer($.FRAMEBUFFER,null)}function x(_,E,u){let W0=Z.get(_);if(E!==void 0)l0(W0.__webglFramebuffer,_,_.texture,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,0);if(u!==void 0)Q6(_)}function D6(_){let E=_.texture,u=Z.get(_),W0=Z.get(E);_.addEventListener("dispose",M);let B0=_.textures,Q0=_.isWebGLCubeRenderTarget===!0,M0=B0.length>1;if(!M0){if(W0.__webglTexture===void 0)W0.__webglTexture=$.createTexture();W0.__version=E.version,Y.memory.textures++}if(Q0){u.__webglFramebuffer=[];for(let D0=0;D0<6;D0++)if(E.mipmaps&&E.mipmaps.length>0){u.__webglFramebuffer[D0]=[];for(let x0=0;x0<E.mipmaps.length;x0++)u.__webglFramebuffer[D0][x0]=$.createFramebuffer()}else u.__webglFramebuffer[D0]=$.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){u.__webglFramebuffer=[];for(let D0=0;D0<E.mipmaps.length;D0++)u.__webglFramebuffer[D0]=$.createFramebuffer()}else u.__webglFramebuffer=$.createFramebuffer();if(M0)for(let D0=0,x0=B0.length;D0<x0;D0++){let a0=Z.get(B0[D0]);if(a0.__webglTexture===void 0)a0.__webglTexture=$.createTexture(),Y.memory.textures++}if(_.samples>0&&c0(_)===!1){u.__webglMultisampledFramebuffer=$.createFramebuffer(),u.__webglColorRenderbuffer=[],Q.bindFramebuffer($.FRAMEBUFFER,u.__webglMultisampledFramebuffer);for(let D0=0;D0<B0.length;D0++){let x0=B0[D0];u.__webglColorRenderbuffer[D0]=$.createRenderbuffer(),$.bindRenderbuffer($.RENDERBUFFER,u.__webglColorRenderbuffer[D0]);let a0=K.convert(x0.format,x0.colorSpace),P0=K.convert(x0.type),X0=R(x0.internalFormat,a0,P0,x0.colorSpace,_.isXRRenderTarget===!0),U0=w0(_);$.renderbufferStorageMultisample($.RENDERBUFFER,U0,X0,_.width,_.height),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+D0,$.RENDERBUFFER,u.__webglColorRenderbuffer[D0])}if($.bindRenderbuffer($.RENDERBUFFER,null),_.depthBuffer)u.__webglDepthRenderbuffer=$.createRenderbuffer(),z0(u.__webglDepthRenderbuffer,_,!0);Q.bindFramebuffer($.FRAMEBUFFER,null)}}if(Q0){Q.bindTexture($.TEXTURE_CUBE_MAP,W0.__webglTexture),t0($.TEXTURE_CUBE_MAP,E);for(let D0=0;D0<6;D0++)if(E.mipmaps&&E.mipmaps.length>0)for(let x0=0;x0<E.mipmaps.length;x0++)l0(u.__webglFramebuffer[D0][x0],_,E,$.COLOR_ATTACHMENT0,$.TEXTURE_CUBE_MAP_POSITIVE_X+D0,x0);else l0(u.__webglFramebuffer[D0],_,E,$.COLOR_ATTACHMENT0,$.TEXTURE_CUBE_MAP_POSITIVE_X+D0,0);if(z(E))L($.TEXTURE_CUBE_MAP);Q.unbindTexture()}else if(M0){for(let D0=0,x0=B0.length;D0<x0;D0++){let a0=B0[D0],P0=Z.get(a0),X0=$.TEXTURE_2D;if(_.isWebGL3DRenderTarget||_.isWebGLArrayRenderTarget)X0=_.isWebGL3DRenderTarget?$.TEXTURE_3D:$.TEXTURE_2D_ARRAY;if(Q.bindTexture(X0,P0.__webglTexture),t0(X0,a0),l0(u.__webglFramebuffer,_,a0,$.COLOR_ATTACHMENT0+D0,X0,0),z(a0))L(X0)}Q.unbindTexture()}else{let D0=$.TEXTURE_2D;if(_.isWebGL3DRenderTarget||_.isWebGLArrayRenderTarget)D0=_.isWebGL3DRenderTarget?$.TEXTURE_3D:$.TEXTURE_2D_ARRAY;if(Q.bindTexture(D0,W0.__webglTexture),t0(D0,E),E.mipmaps&&E.mipmaps.length>0)for(let x0=0;x0<E.mipmaps.length;x0++)l0(u.__webglFramebuffer[x0],_,E,$.COLOR_ATTACHMENT0,D0,x0);else l0(u.__webglFramebuffer,_,E,$.COLOR_ATTACHMENT0,D0,0);if(z(E))L(D0);Q.unbindTexture()}if(_.depthBuffer)Q6(_)}function s0(_){let E=_.textures;for(let u=0,W0=E.length;u<W0;u++){let B0=E[u];if(z(B0)){let Q0=T(_),M0=Z.get(B0).__webglTexture;Q.bindTexture(Q0,M0),L(Q0),Q.unbindTexture()}}}let o0=[],g0=[];function A6(_){if(_.samples>0){if(c0(_)===!1){let{textures:E,width:u,height:W0}=_,B0=$.COLOR_BUFFER_BIT,Q0=_.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT,M0=Z.get(_),D0=E.length>1;if(D0)for(let a0=0;a0<E.length;a0++)Q.bindFramebuffer($.FRAMEBUFFER,M0.__webglMultisampledFramebuffer),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+a0,$.RENDERBUFFER,null),Q.bindFramebuffer($.FRAMEBUFFER,M0.__webglFramebuffer),$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0+a0,$.TEXTURE_2D,null,0);Q.bindFramebuffer($.READ_FRAMEBUFFER,M0.__webglMultisampledFramebuffer);let x0=_.texture.mipmaps;if(x0&&x0.length>0)Q.bindFramebuffer($.DRAW_FRAMEBUFFER,M0.__webglFramebuffer[0]);else Q.bindFramebuffer($.DRAW_FRAMEBUFFER,M0.__webglFramebuffer);for(let a0=0;a0<E.length;a0++){if(_.resolveDepthBuffer){if(_.depthBuffer)B0|=$.DEPTH_BUFFER_BIT;if(_.stencilBuffer&&_.resolveStencilBuffer)B0|=$.STENCIL_BUFFER_BIT}if(D0){$.framebufferRenderbuffer($.READ_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.RENDERBUFFER,M0.__webglColorRenderbuffer[a0]);let P0=Z.get(E[a0]).__webglTexture;$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,P0,0)}if($.blitFramebuffer(0,0,u,W0,0,0,u,W0,B0,$.NEAREST),G===!0){if(o0.length=0,g0.length=0,o0.push($.COLOR_ATTACHMENT0+a0),_.depthBuffer&&_.resolveDepthBuffer===!1)o0.push(Q0),g0.push(Q0),$.invalidateFramebuffer($.DRAW_FRAMEBUFFER,g0);$.invalidateFramebuffer($.READ_FRAMEBUFFER,o0)}}if(Q.bindFramebuffer($.READ_FRAMEBUFFER,null),Q.bindFramebuffer($.DRAW_FRAMEBUFFER,null),D0)for(let a0=0;a0<E.length;a0++){Q.bindFramebuffer($.FRAMEBUFFER,M0.__webglMultisampledFramebuffer),$.framebufferRenderbuffer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+a0,$.RENDERBUFFER,M0.__webglColorRenderbuffer[a0]);let P0=Z.get(E[a0]).__webglTexture;Q.bindFramebuffer($.FRAMEBUFFER,M0.__webglFramebuffer),$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0+a0,$.TEXTURE_2D,P0,0)}Q.bindFramebuffer($.DRAW_FRAMEBUFFER,M0.__webglMultisampledFramebuffer)}else if(_.depthBuffer&&_.resolveDepthBuffer===!1&&G){let E=_.stencilBuffer?$.DEPTH_STENCIL_ATTACHMENT:$.DEPTH_ATTACHMENT;$.invalidateFramebuffer($.DRAW_FRAMEBUFFER,[E])}}}function w0(_){return Math.min(W.maxSamples,_.samples)}function c0(_){let E=Z.get(_);return _.samples>0&&J.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function X6(_){let E=Y.render.frame;if(H.get(_)!==E)H.set(_,E),_.update()}function C6(_,E){let{colorSpace:u,format:W0,type:B0}=_;if(_.isCompressedTexture===!0||_.isVideoTexture===!0)return E;if(u!=="srgb-linear"&&u!=="")if(I6.getTransfer(u)==="srgb"){if(W0!==1023||B0!==1009)console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else console.error("THREE.WebGLTextures: Unsupported texture color space:",u);return E}function _6(_){if(typeof HTMLImageElement<"u"&&_ instanceof HTMLImageElement)V.width=_.naturalWidth||_.width,V.height=_.naturalHeight||_.height;else if(typeof VideoFrame<"u"&&_ instanceof VideoFrame)V.width=_.displayWidth,V.height=_.displayHeight;else V.width=_.width,V.height=_.height;return V}this.allocateTextureUnit=m,this.resetTextureUnits=l,this.setTexture2D=o,this.setTexture2DArray=$0,this.setTexture3D=F0,this.setTextureCube=J0,this.rebindTextures=x,this.setupRenderTarget=D6,this.updateRenderTargetMipmap=s0,this.updateMultisampleRenderTarget=A6,this.setupDepthRenderbuffer=Q6,this.setupFrameBufferTexture=l0,this.useMultisampledRTT=c0}function wH($,J){function Q(Z,W=""){let K,Y=I6.getTransfer(W);if(Z===1009)return $.UNSIGNED_BYTE;if(Z===1017)return $.UNSIGNED_SHORT_4_4_4_4;if(Z===1018)return $.UNSIGNED_SHORT_5_5_5_1;if(Z===35902)return $.UNSIGNED_INT_5_9_9_9_REV;if(Z===35899)return $.UNSIGNED_INT_10F_11F_11F_REV;if(Z===1010)return $.BYTE;if(Z===1011)return $.SHORT;if(Z===1012)return $.UNSIGNED_SHORT;if(Z===1013)return $.INT;if(Z===1014)return $.UNSIGNED_INT;if(Z===1015)return $.FLOAT;if(Z===1016)return $.HALF_FLOAT;if(Z===1021)return $.ALPHA;if(Z===1022)return $.RGB;if(Z===1023)return $.RGBA;if(Z===1026)return $.DEPTH_COMPONENT;if(Z===1027)return $.DEPTH_STENCIL;if(Z===1028)return $.RED;if(Z===1029)return $.RED_INTEGER;if(Z===1030)return $.RG;if(Z===1031)return $.RG_INTEGER;if(Z===1033)return $.RGBA_INTEGER;if(Z===33776||Z===33777||Z===33778||Z===33779)if(Y==="srgb")if(K=J.get("WEBGL_compressed_texture_s3tc_srgb"),K!==null){if(Z===33776)return K.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===33777)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===33778)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===33779)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(K=J.get("WEBGL_compressed_texture_s3tc"),K!==null){if(Z===33776)return K.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===33777)return K.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===33778)return K.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===33779)return K.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===35840||Z===35841||Z===35842||Z===35843)if(K=J.get("WEBGL_compressed_texture_pvrtc"),K!==null){if(Z===35840)return K.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===35841)return K.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===35842)return K.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===35843)return K.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===36196||Z===37492||Z===37496)if(K=J.get("WEBGL_compressed_texture_etc"),K!==null){if(Z===36196||Z===37492)return Y==="srgb"?K.COMPRESSED_SRGB8_ETC2:K.COMPRESSED_RGB8_ETC2;if(Z===37496)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:K.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(Z===37808||Z===37809||Z===37810||Z===37811||Z===37812||Z===37813||Z===37814||Z===37815||Z===37816||Z===37817||Z===37818||Z===37819||Z===37820||Z===37821)if(K=J.get("WEBGL_compressed_texture_astc"),K!==null){if(Z===37808)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:K.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===37809)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:K.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===37810)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:K.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===37811)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:K.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===37812)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:K.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===37813)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:K.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===37814)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:K.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===37815)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:K.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===37816)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:K.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===37817)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:K.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===37818)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:K.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===37819)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:K.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===37820)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:K.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===37821)return Y==="srgb"?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:K.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===36492||Z===36494||Z===36495)if(K=J.get("EXT_texture_compression_bptc"),K!==null){if(Z===36492)return Y==="srgb"?K.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:K.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===36494)return K.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===36495)return K.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===36283||Z===36284||Z===36285||Z===36286)if(K=J.get("EXT_texture_compression_rgtc"),K!==null){if(Z===36283)return K.COMPRESSED_RED_RGTC1_EXT;if(Z===36284)return K.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===36285)return K.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===36286)return K.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===1020)return $.UNSIGNED_INT_24_8;return $[Z]!==void 0?$[Z]:null}return{convert:Q}}class K3{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init($,J){if(this.texture===null){let Q=new f1($.texture);if($.depthNear!==J.depthNear||$.depthFar!==J.depthFar)this.depthNear=$.depthNear,this.depthFar=$.depthFar;this.texture=Q}}getMesh($){if(this.texture!==null){if(this.mesh===null){let J=$.cameras[0].viewport,Q=new n7({vertexShader:MH,fragmentShader:TH,uniforms:{depthColor:{value:this.texture},depthWidth:{value:J.z},depthHeight:{value:J.w}}});this.mesh=new O7(new o5(20,20),Q)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}function vH($,J){function Q(z,L){if(z.matrixAutoUpdate===!0)z.updateMatrix();L.value.copy(z.matrix)}function Z(z,L){if(L.color.getRGB(z.fogColor.value,GK($)),L.isFog)z.fogNear.value=L.near,z.fogFar.value=L.far;else if(L.isFogExp2)z.fogDensity.value=L.density}function W(z,L,T,R,v){if(L.isMeshBasicMaterial)K(z,L);else if(L.isMeshLambertMaterial)K(z,L);else if(L.isMeshToonMaterial)K(z,L),N(z,L);else if(L.isMeshPhongMaterial)K(z,L),H(z,L);else if(L.isMeshStandardMaterial){if(K(z,L),O(z,L),L.isMeshPhysicalMaterial)P(z,L,v)}else if(L.isMeshMatcapMaterial)K(z,L),D(z,L);else if(L.isMeshDepthMaterial)K(z,L);else if(L.isMeshDistanceMaterial)K(z,L),C(z,L);else if(L.isMeshNormalMaterial)K(z,L);else if(L.isLineBasicMaterial){if(Y(z,L),L.isLineDashedMaterial)q(z,L)}else if(L.isPointsMaterial)G(z,L,T,R);else if(L.isSpriteMaterial)V(z,L);else if(L.isShadowMaterial)z.color.value.copy(L.color),z.opacity.value=L.opacity;else if(L.isShaderMaterial)L.uniformsNeedUpdate=!1}function K(z,L){if(z.opacity.value=L.opacity,L.color)z.diffuse.value.copy(L.color);if(L.emissive)z.emissive.value.copy(L.emissive).multiplyScalar(L.emissiveIntensity);if(L.map)z.map.value=L.map,Q(L.map,z.mapTransform);if(L.alphaMap)z.alphaMap.value=L.alphaMap,Q(L.alphaMap,z.alphaMapTransform);if(L.bumpMap){if(z.bumpMap.value=L.bumpMap,Q(L.bumpMap,z.bumpMapTransform),z.bumpScale.value=L.bumpScale,L.side===1)z.bumpScale.value*=-1}if(L.normalMap){if(z.normalMap.value=L.normalMap,Q(L.normalMap,z.normalMapTransform),z.normalScale.value.copy(L.normalScale),L.side===1)z.normalScale.value.negate()}if(L.displacementMap)z.displacementMap.value=L.displacementMap,Q(L.displacementMap,z.displacementMapTransform),z.displacementScale.value=L.displacementScale,z.displacementBias.value=L.displacementBias;if(L.emissiveMap)z.emissiveMap.value=L.emissiveMap,Q(L.emissiveMap,z.emissiveMapTransform);if(L.specularMap)z.specularMap.value=L.specularMap,Q(L.specularMap,z.specularMapTransform);if(L.alphaTest>0)z.alphaTest.value=L.alphaTest;let T=J.get(L),R=T.envMap,v=T.envMapRotation;if(R){if(z.envMap.value=R,U$.copy(v),U$.x*=-1,U$.y*=-1,U$.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1)U$.y*=-1,U$.z*=-1;z.envMapRotation.value.setFromMatrix4(kH.makeRotationFromEuler(U$)),z.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,z.reflectivity.value=L.reflectivity,z.ior.value=L.ior,z.refractionRatio.value=L.refractionRatio}if(L.lightMap)z.lightMap.value=L.lightMap,z.lightMapIntensity.value=L.lightMapIntensity,Q(L.lightMap,z.lightMapTransform);if(L.aoMap)z.aoMap.value=L.aoMap,z.aoMapIntensity.value=L.aoMapIntensity,Q(L.aoMap,z.aoMapTransform)}function Y(z,L){if(z.diffuse.value.copy(L.color),z.opacity.value=L.opacity,L.map)z.map.value=L.map,Q(L.map,z.mapTransform)}function q(z,L){z.dashSize.value=L.dashSize,z.totalSize.value=L.dashSize+L.gapSize,z.scale.value=L.scale}function G(z,L,T,R){if(z.diffuse.value.copy(L.color),z.opacity.value=L.opacity,z.size.value=L.size*T,z.scale.value=R*0.5,L.map)z.map.value=L.map,Q(L.map,z.uvTransform);if(L.alphaMap)z.alphaMap.value=L.alphaMap,Q(L.alphaMap,z.alphaMapTransform);if(L.alphaTest>0)z.alphaTest.value=L.alphaTest}function V(z,L){if(z.diffuse.value.copy(L.color),z.opacity.value=L.opacity,z.rotation.value=L.rotation,L.map)z.map.value=L.map,Q(L.map,z.mapTransform);if(L.alphaMap)z.alphaMap.value=L.alphaMap,Q(L.alphaMap,z.alphaMapTransform);if(L.alphaTest>0)z.alphaTest.value=L.alphaTest}function H(z,L){z.specular.value.copy(L.specular),z.shininess.value=Math.max(L.shininess,0.0001)}function N(z,L){if(L.gradientMap)z.gradientMap.value=L.gradientMap}function O(z,L){if(z.metalness.value=L.metalness,L.metalnessMap)z.metalnessMap.value=L.metalnessMap,Q(L.metalnessMap,z.metalnessMapTransform);if(z.roughness.value=L.roughness,L.roughnessMap)z.roughnessMap.value=L.roughnessMap,Q(L.roughnessMap,z.roughnessMapTransform);if(L.envMap)z.envMapIntensity.value=L.envMapIntensity}function P(z,L,T){if(z.ior.value=L.ior,L.sheen>0){if(z.sheenColor.value.copy(L.sheenColor).multiplyScalar(L.sheen),z.sheenRoughness.value=L.sheenRoughness,L.sheenColorMap)z.sheenColorMap.value=L.sheenColorMap,Q(L.sheenColorMap,z.sheenColorMapTransform);if(L.sheenRoughnessMap)z.sheenRoughnessMap.value=L.sheenRoughnessMap,Q(L.sheenRoughnessMap,z.sheenRoughnessMapTransform)}if(L.clearcoat>0){if(z.clearcoat.value=L.clearcoat,z.clearcoatRoughness.value=L.clearcoatRoughness,L.clearcoatMap)z.clearcoatMap.value=L.clearcoatMap,Q(L.clearcoatMap,z.clearcoatMapTransform);if(L.clearcoatRoughnessMap)z.clearcoatRoughnessMap.value=L.clearcoatRoughnessMap,Q(L.clearcoatRoughnessMap,z.clearcoatRoughnessMapTransform);if(L.clearcoatNormalMap){if(z.clearcoatNormalMap.value=L.clearcoatNormalMap,Q(L.clearcoatNormalMap,z.clearcoatNormalMapTransform),z.clearcoatNormalScale.value.copy(L.clearcoatNormalScale),L.side===1)z.clearcoatNormalScale.value.negate()}}if(L.dispersion>0)z.dispersion.value=L.dispersion;if(L.iridescence>0){if(z.iridescence.value=L.iridescence,z.iridescenceIOR.value=L.iridescenceIOR,z.iridescenceThicknessMinimum.value=L.iridescenceThicknessRange[0],z.iridescenceThicknessMaximum.value=L.iridescenceThicknessRange[1],L.iridescenceMap)z.iridescenceMap.value=L.iridescenceMap,Q(L.iridescenceMap,z.iridescenceMapTransform);if(L.iridescenceThicknessMap)z.iridescenceThicknessMap.value=L.iridescenceThicknessMap,Q(L.iridescenceThicknessMap,z.iridescenceThicknessMapTransform)}if(L.transmission>0){if(z.transmission.value=L.transmission,z.transmissionSamplerMap.value=T.texture,z.transmissionSamplerSize.value.set(T.width,T.height),L.transmissionMap)z.transmissionMap.value=L.transmissionMap,Q(L.transmissionMap,z.transmissionMapTransform);if(z.thickness.value=L.thickness,L.thicknessMap)z.thicknessMap.value=L.thicknessMap,Q(L.thicknessMap,z.thicknessMapTransform);z.attenuationDistance.value=L.attenuationDistance,z.attenuationColor.value.copy(L.attenuationColor)}if(L.anisotropy>0){if(z.anisotropyVector.value.set(L.anisotropy*Math.cos(L.anisotropyRotation),L.anisotropy*Math.sin(L.anisotropyRotation)),L.anisotropyMap)z.anisotropyMap.value=L.anisotropyMap,Q(L.anisotropyMap,z.anisotropyMapTransform)}if(z.specularIntensity.value=L.specularIntensity,z.specularColor.value.copy(L.specularColor),L.specularColorMap)z.specularColorMap.value=L.specularColorMap,Q(L.specularColorMap,z.specularColorMapTransform);if(L.specularIntensityMap)z.specularIntensityMap.value=L.specularIntensityMap,Q(L.specularIntensityMap,z.specularIntensityMapTransform)}function D(z,L){if(L.matcap)z.matcap.value=L.matcap}function C(z,L){let T=J.get(L).light;z.referencePosition.value.setFromMatrixPosition(T.matrixWorld),z.nearDistance.value=T.shadow.camera.near,z.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:W}}function _H($,J,Q,Z){let W={},K={},Y=[],q=$.getParameter($.MAX_UNIFORM_BUFFER_BINDINGS);function G(T,R){let v=R.program;Z.uniformBlockBinding(T,v)}function V(T,R){let v=W[T.id];if(v===void 0)D(T),v=H(T),W[T.id]=v,T.addEventListener("dispose",z);let g=R.program;Z.updateUBOMapping(T,g);let y=J.render.frame;if(K[T.id]!==y)O(T),K[T.id]=y}function H(T){let R=N();T.__bindingPointIndex=R;let v=$.createBuffer(),g=T.__size,y=T.usage;return $.bindBuffer($.UNIFORM_BUFFER,v),$.bufferData($.UNIFORM_BUFFER,g,y),$.bindBuffer($.UNIFORM_BUFFER,null),$.bindBufferBase($.UNIFORM_BUFFER,R,v),v}function N(){for(let T=0;T<q;T++)if(Y.indexOf(T)===-1)return Y.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function O(T){let R=W[T.id],v=T.uniforms,g=T.__cache;$.bindBuffer($.UNIFORM_BUFFER,R);for(let y=0,M=v.length;y<M;y++){let p=Array.isArray(v[y])?v[y]:[v[y]];for(let A=0,j=p.length;A<j;A++){let h=p[A];if(P(h,y,A,g)===!0){let l=h.__offset,m=Array.isArray(h.value)?h.value:[h.value],n=0;for(let o=0;o<m.length;o++){let $0=m[o],F0=C($0);if(typeof $0==="number"||typeof $0==="boolean")h.__data[0]=$0,$.bufferSubData($.UNIFORM_BUFFER,l+n,h.__data);else if($0.isMatrix3)h.__data[0]=$0.elements[0],h.__data[1]=$0.elements[1],h.__data[2]=$0.elements[2],h.__data[3]=0,h.__data[4]=$0.elements[3],h.__data[5]=$0.elements[4],h.__data[6]=$0.elements[5],h.__data[7]=0,h.__data[8]=$0.elements[6],h.__data[9]=$0.elements[7],h.__data[10]=$0.elements[8],h.__data[11]=0;else $0.toArray(h.__data,n),n+=F0.storage/Float32Array.BYTES_PER_ELEMENT}$.bufferSubData($.UNIFORM_BUFFER,l,h.__data)}}}$.bindBuffer($.UNIFORM_BUFFER,null)}function P(T,R,v,g){let y=T.value,M=R+"_"+v;if(g[M]===void 0){if(typeof y==="number"||typeof y==="boolean")g[M]=y;else g[M]=y.clone();return!0}else{let p=g[M];if(typeof y==="number"||typeof y==="boolean"){if(p!==y)return g[M]=y,!0}else if(p.equals(y)===!1)return p.copy(y),!0}return!1}function D(T){let R=T.uniforms,v=0,g=16;for(let M=0,p=R.length;M<p;M++){let A=Array.isArray(R[M])?R[M]:[R[M]];for(let j=0,h=A.length;j<h;j++){let l=A[j],m=Array.isArray(l.value)?l.value:[l.value];for(let n=0,o=m.length;n<o;n++){let $0=m[n],F0=C($0),J0=v%g,I0=J0%F0.boundary,y0=J0+I0;if(v+=I0,y0!==0&&g-y0<F0.storage)v+=g-y0;l.__data=new Float32Array(F0.storage/Float32Array.BYTES_PER_ELEMENT),l.__offset=v,v+=F0.storage}}}let y=v%g;if(y>0)v+=g-y;return T.__size=v,T.__cache={},this}function C(T){let R={boundary:0,storage:0};if(typeof T==="number"||typeof T==="boolean")R.boundary=4,R.storage=4;else if(T.isVector2)R.boundary=8,R.storage=8;else if(T.isVector3||T.isColor)R.boundary=16,R.storage=12;else if(T.isVector4)R.boundary=16,R.storage=16;else if(T.isMatrix3)R.boundary=48,R.storage=48;else if(T.isMatrix4)R.boundary=64,R.storage=64;else if(T.isTexture)console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.");else console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T);return R}function z(T){let R=T.target;R.removeEventListener("dispose",z);let v=Y.indexOf(R.__bindingPointIndex);Y.splice(v,1),$.deleteBuffer(W[R.id]),delete W[R.id],delete K[R.id]}function L(){for(let T in W)$.deleteBuffer(W[T]);Y=[],W={},K={}}return{bind:G,update:V,dispose:L}}class Y3{constructor($={}){let{canvas:J=FX(),context:Q=null,depth:Z=!0,stencil:W=!1,alpha:K=!1,antialias:Y=!1,premultipliedAlpha:q=!0,preserveDrawingBuffer:G=!1,powerPreference:V="default",failIfMajorPerformanceCaveat:H=!1,reversedDepthBuffer:N=!1}=$;this.isWebGLRenderer=!0;let O;if(Q!==null){if(typeof WebGLRenderingContext<"u"&&Q instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");O=Q.getContextAttributes().alpha}else O=K;let P=new Uint32Array(4),D=new Int32Array(4),C=null,z=null,L=[],T=[];this.domElement=J,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,v=!1;this._outputColorSpace="srgb";let g=0,y=0,M=null,p=-1,A=null,j=new S6,h=new S6,l=null,m=new U6(0),n=0,o=J.width,$0=J.height,F0=1,J0=null,I0=null,y0=new S6(0,0,o,$0),u0=new S6(0,0,o,$0),t0=!1,O6=new wJ,B6=!1,q0=!1,S0=new q6,A0=new d,l0=new S6,z0={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},e0=!1;function Q6(){return M===null?F0:1}let x=Q;function D6(w,c){return J.getContext(w,c)}try{let w={alpha:!0,depth:Z,stencil:W,antialias:Y,premultipliedAlpha:q,preserveDrawingBuffer:G,powerPreference:V,failIfMajorPerformanceCaveat:H};if("setAttribute"in J)J.setAttribute("data-engine","three.js r180");if(J.addEventListener("webglcontextlost",j0,!1),J.addEventListener("webglcontextrestored",E0,!1),J.addEventListener("webglcontextcreationerror",b0,!1),x===null){if(x=D6("webgl2",w),x===null)if(D6("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(w){throw console.error("THREE.WebGLRenderer: "+w.message),w}let s0,o0,g0,A6,w0,c0,X6,C6,_6,_,E,u,W0,B0,Q0,M0,D0,x0,a0,P0,X0,U0,H0,T0;function Z6(){if(s0=new rB(x),s0.init(),U0=new wH(x,s0),o0=new dB(x,s0,$,U0),g0=new AH(x,s0),o0.reversedDepthBuffer&&N)g0.buffers.depth.setReversed(!0);A6=new $2(x),w0=new HH,c0=new jH(x,s0,g0,w0,o0,U0,A6),X6=new nB(R),C6=new aB(R),_6=new UG(x),H0=new lB(x,_6),_=new tB(x,_6,A6,H0),E=new Q2(x,_,_6,A6),a0=new J2(x,o0,c0),M0=new cB(w0),u=new BH(R,X6,C6,s0,o0,H0,M0),W0=new vH(R,w0),B0=new FH,Q0=new DH(s0),x0=new uB(R,X6,C6,g0,E,O,q),D0=new EH(R,E,o0),T0=new _H(x,A6,o0,g0),P0=new mB(x,s0,A6),X0=new eB(x,s0,A6),A6.programs=u.programs,R.capabilities=o0,R.extensions=s0,R.properties=w0,R.renderLists=B0,R.shadowMap=D0,R.state=g0,R.info=A6}Z6();let f=new U3(R,x);this.xr=f,this.getContext=function(){return x},this.getContextAttributes=function(){return x.getContextAttributes()},this.forceContextLoss=function(){let w=s0.get("WEBGL_lose_context");if(w)w.loseContext()},this.forceContextRestore=function(){let w=s0.get("WEBGL_lose_context");if(w)w.restoreContext()},this.getPixelRatio=function(){return F0},this.setPixelRatio=function(w){if(w===void 0)return;F0=w,this.setSize(o,$0,!1)},this.getSize=function(w){return w.set(o,$0)},this.setSize=function(w,c,r=!0){if(f.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}if(o=w,$0=c,J.width=Math.floor(w*F0),J.height=Math.floor(c*F0),r===!0)J.style.width=w+"px",J.style.height=c+"px";this.setViewport(0,0,w,c)},this.getDrawingBufferSize=function(w){return w.set(o*F0,$0*F0).floor()},this.setDrawingBufferSize=function(w,c,r){o=w,$0=c,F0=r,J.width=Math.floor(w*r),J.height=Math.floor(c*r),this.setViewport(0,0,w,c)},this.getCurrentViewport=function(w){return w.copy(j)},this.getViewport=function(w){return w.copy(y0)},this.setViewport=function(w,c,r,t){if(w.isVector4)y0.set(w.x,w.y,w.z,w.w);else y0.set(w,c,r,t);g0.viewport(j.copy(y0).multiplyScalar(F0).round())},this.getScissor=function(w){return w.copy(u0)},this.setScissor=function(w,c,r,t){if(w.isVector4)u0.set(w.x,w.y,w.z,w.w);else u0.set(w,c,r,t);g0.scissor(h.copy(u0).multiplyScalar(F0).round())},this.getScissorTest=function(){return t0},this.setScissorTest=function(w){g0.setScissorTest(t0=w)},this.setOpaqueSort=function(w){J0=w},this.setTransparentSort=function(w){I0=w},this.getClearColor=function(w){return w.copy(x0.getClearColor())},this.setClearColor=function(){x0.setClearColor(...arguments)},this.getClearAlpha=function(){return x0.getClearAlpha()},this.setClearAlpha=function(){x0.setClearAlpha(...arguments)},this.clear=function(w=!0,c=!0,r=!0){let t=0;if(w){let i=!1;if(M!==null){let O0=M.texture.format;i=O0===1033||O0===1031||O0===1029}if(i){let O0=M.texture.type,k0=O0===1009||O0===1014||O0===1012||O0===1020||O0===1017||O0===1018,p0=x0.getClearColor(),v0=x0.getClearAlpha(),i0=p0.r,r0=p0.g,n0=p0.b;if(k0)P[0]=i0,P[1]=r0,P[2]=n0,P[3]=v0,x.clearBufferuiv(x.COLOR,0,P);else D[0]=i0,D[1]=r0,D[2]=n0,D[3]=v0,x.clearBufferiv(x.COLOR,0,D)}else t|=x.COLOR_BUFFER_BIT}if(c)t|=x.DEPTH_BUFFER_BIT;if(r)t|=x.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);x.clear(t)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){J.removeEventListener("webglcontextlost",j0,!1),J.removeEventListener("webglcontextrestored",E0,!1),J.removeEventListener("webglcontextcreationerror",b0,!1),x0.dispose(),B0.dispose(),Q0.dispose(),w0.dispose(),X6.dispose(),C6.dispose(),E.dispose(),H0.dispose(),T0.dispose(),u.dispose(),f.dispose(),f.removeEventListener("sessionstart",T6),f.removeEventListener("sessionend",z7),$7.stop()};function j0(w){w.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),v=!0}function E0(){console.log("THREE.WebGLRenderer: Context Restored."),v=!1;let w=A6.autoReset,c=D0.enabled,r=D0.autoUpdate,t=D0.needsUpdate,i=D0.type;Z6(),A6.autoReset=w,D0.enabled=c,D0.autoUpdate=r,D0.needsUpdate=t,D0.type=i}function b0(w){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function L0(w){let c=w.target;c.removeEventListener("dispose",L0),Y0(c)}function Y0(w){C0(w),w0.remove(w)}function C0(w){let c=w0.get(w).programs;if(c!==void 0){if(c.forEach(function(r){u.releaseProgram(r)}),w.isShaderMaterial)u.releaseShaderCache(w)}}this.renderBufferDirect=function(w,c,r,t,i,O0){if(c===null)c=z0;let k0=i.isMesh&&i.matrixWorld.determinant()<0,p0=g8(w,c,r,t,i);g0.setMaterial(t,k0);let v0=r.index,i0=1;if(t.wireframe===!0){if(v0=_.getWireframeAttribute(r),v0===void 0)return;i0=2}let r0=r.drawRange,n0=r.attributes.position,N0=r0.start*i0,R6=(r0.start+r0.count)*i0;if(O0!==null)N0=Math.max(N0,O0.start*i0),R6=Math.min(R6,(O0.start+O0.count)*i0);if(v0!==null)N0=Math.max(N0,0),R6=Math.min(R6,v0.count);else if(n0!==void 0&&n0!==null)N0=Math.max(N0,0),R6=Math.min(R6,n0.count);let m0=R6-N0;if(m0<0||m0===1/0)return;H0.setup(i,t,p0,r,v0);let P6,E6=P0;if(v0!==null)P6=_6.get(v0),E6=X0,E6.setIndex(P6);if(i.isMesh)if(t.wireframe===!0)g0.setLineWidth(t.wireframeLinewidth*Q6()),E6.setMode(x.LINES);else E6.setMode(x.TRIANGLES);else if(i.isLine){let h0=t.linewidth;if(h0===void 0)h0=1;if(g0.setLineWidth(h0*Q6()),i.isLineSegments)E6.setMode(x.LINES);else if(i.isLineLoop)E6.setMode(x.LINE_LOOP);else E6.setMode(x.LINE_STRIP)}else if(i.isPoints)E6.setMode(x.POINTS);else if(i.isSprite)E6.setMode(x.TRIANGLES);if(i.isBatchedMesh)if(i._multiDrawInstances!==null)i5("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),E6.renderMultiDrawInstances(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount,i._multiDrawInstances);else if(!s0.get("WEBGL_multi_draw")){let{_multiDrawStarts:h0,_multiDrawCounts:y6,_multiDrawCount:a}=i,K0=v0?_6.get(v0).bytesPerElement:1,a7=w0.get(t).currentProgram.getUniforms();for(let e6=0;e6<a;e6++)a7.setValue(x,"_gl_DrawID",e6),E6.render(h0[e6]/K0,y6[e6])}else E6.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else if(i.isInstancedMesh)E6.renderInstances(N0,m0,i.count);else if(r.isInstancedBufferGeometry){let h0=r._maxInstanceCount!==void 0?r._maxInstanceCount:1/0,y6=Math.min(r.instanceCount,h0);E6.renderInstances(N0,m0,y6)}else E6.render(N0,m0)};function J6(w,c,r){if(w.transparent===!0&&w.side===2&&w.forceSinglePass===!1)w.side=1,w.needsUpdate=!0,J7(w,c,r),w.side=0,w.needsUpdate=!0,J7(w,c,r),w.side=2;else J7(w,c,r)}this.compile=function(w,c,r=null){if(r===null)r=w;if(z=Q0.get(r),z.init(c),T.push(z),r.traverseVisible(function(i){if(i.isLight&&i.layers.test(c.layers)){if(z.pushLight(i),i.castShadow)z.pushShadow(i)}}),w!==r)w.traverseVisible(function(i){if(i.isLight&&i.layers.test(c.layers)){if(z.pushLight(i),i.castShadow)z.pushShadow(i)}});z.setupLights();let t=new Set;return w.traverse(function(i){if(!(i.isMesh||i.isPoints||i.isLine||i.isSprite))return;let O0=i.material;if(O0)if(Array.isArray(O0))for(let k0=0;k0<O0.length;k0++){let p0=O0[k0];J6(p0,r,i),t.add(p0)}else J6(O0,r,i),t.add(O0)}),z=T.pop(),t},this.compileAsync=function(w,c,r=null){let t=this.compile(w,c,r);return new Promise((i)=>{function O0(){if(t.forEach(function(k0){if(w0.get(k0).currentProgram.isReady())t.delete(k0)}),t.size===0){i(w);return}setTimeout(O0,10)}if(s0.get("KHR_parallel_shader_compile")!==null)O0();else setTimeout(O0,10)})};let L6=null;function R0(w){if(L6)L6(w)}function T6(){$7.stop()}function z7(){$7.start()}let $7=new oK;if($7.setAnimationLoop(R0),typeof self<"u")$7.setContext(self);this.setAnimationLoop=function(w){L6=w,f.setAnimationLoop(w),w===null?$7.stop():$7.start()},f.addEventListener("sessionstart",T6),f.addEventListener("sessionend",z7),this.render=function(w,c){if(c!==void 0&&c.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(v===!0)return;if(w.matrixWorldAutoUpdate===!0)w.updateMatrixWorld();if(c.parent===null&&c.matrixWorldAutoUpdate===!0)c.updateMatrixWorld();if(f.enabled===!0&&f.isPresenting===!0){if(f.cameraAutoUpdate===!0)f.updateCamera(c);c=f.getCamera()}if(w.isScene===!0)w.onBeforeRender(R,w,c,M);if(z=Q0.get(w,T.length),z.init(c),T.push(z),S0.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse),O6.setFromProjectionMatrix(S0,2000,c.reversedDepth),q0=this.localClippingEnabled,B6=M0.init(this.clippingPlanes,q0),C=B0.get(w,L.length),C.init(),L.push(C),f.enabled===!0&&f.isPresenting===!0){let O0=R.xr.getDepthSensingMesh();if(O0!==null)L$(O0,c,-1/0,R.sortObjects)}if(L$(w,c,0,R.sortObjects),C.finish(),R.sortObjects===!0)C.sort(J0,I0);if(e0=f.enabled===!1||f.isPresenting===!1||f.hasDepthSensing()===!1,e0)x0.addToRenderList(C,w);if(this.info.render.frame++,B6===!0)M0.beginShadows();let r=z.state.shadowsArray;if(D0.render(r,w,c),B6===!0)M0.endShadows();if(this.info.autoReset===!0)this.info.reset();let{opaque:t,transmissive:i}=C;if(z.setupLights(),c.isArrayCamera){let O0=c.cameras;if(i.length>0)for(let k0=0,p0=O0.length;k0<p0;k0++){let v0=O0[k0];H6(t,i,w,v0)}if(e0)x0.render(w);for(let k0=0,p0=O0.length;k0<p0;k0++){let v0=O0[k0];N5(C,w,v0,v0.viewport)}}else{if(i.length>0)H6(t,i,w,c);if(e0)x0.render(w);N5(C,w,c)}if(M!==null&&y===0)c0.updateMultisampleRenderTarget(M),c0.updateRenderTargetMipmap(M);if(w.isScene===!0)w.onAfterRender(R,w,c);if(H0.resetDefaultState(),p=-1,A=null,T.pop(),T.length>0){if(z=T[T.length-1],B6===!0)M0.setGlobalState(R.clippingPlanes,z.state.camera)}else z=null;if(L.pop(),L.length>0)C=L[L.length-1];else C=null};function L$(w,c,r,t){if(w.visible===!1)return;if(w.layers.test(c.layers)){if(w.isGroup)r=w.renderOrder;else if(w.isLOD){if(w.autoUpdate===!0)w.update(c)}else if(w.isLight){if(z.pushLight(w),w.castShadow)z.pushShadow(w)}else if(w.isSprite){if(!w.frustumCulled||O6.intersectsSprite(w)){if(t)l0.setFromMatrixPosition(w.matrixWorld).applyMatrix4(S0);let k0=E.update(w),p0=w.material;if(p0.visible)C.push(w,k0,p0,r,l0.z,null)}}else if(w.isMesh||w.isLine||w.isPoints){if(!w.frustumCulled||O6.intersectsObject(w)){let k0=E.update(w),p0=w.material;if(t){if(w.boundingSphere!==void 0){if(w.boundingSphere===null)w.computeBoundingSphere();l0.copy(w.boundingSphere.center)}else{if(k0.boundingSphere===null)k0.computeBoundingSphere();l0.copy(k0.boundingSphere.center)}l0.applyMatrix4(w.matrixWorld).applyMatrix4(S0)}if(Array.isArray(p0)){let v0=k0.groups;for(let i0=0,r0=v0.length;i0<r0;i0++){let n0=v0[i0],N0=p0[n0.materialIndex];if(N0&&N0.visible)C.push(w,k0,N0,r,l0.z,n0)}}else if(p0.visible)C.push(w,k0,p0,r,l0.z,null)}}}let O0=w.children;for(let k0=0,p0=O0.length;k0<p0;k0++)L$(O0[k0],c,r,t)}function N5(w,c,r,t){let{opaque:i,transmissive:O0,transparent:k0}=w;if(z.setupLightsView(r),B6===!0)M0.setGlobalState(R.clippingPlanes,r);if(t)g0.viewport(j.copy(t));if(i.length>0)w6(i,c,r);if(O0.length>0)w6(O0,c,r);if(k0.length>0)w6(k0,c,r);g0.buffers.depth.setTest(!0),g0.buffers.depth.setMask(!0),g0.buffers.color.setMask(!0),g0.setPolygonOffset(!1)}function H6(w,c,r,t){if((r.isScene===!0?r.overrideMaterial:null)!==null)return;if(z.state.transmissionRenderTarget[t.id]===void 0)z.state.transmissionRenderTarget[t.id]=new G8(1,1,{generateMipmaps:!0,type:s0.has("EXT_color_buffer_half_float")||s0.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:W,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:I6.workingColorSpace});let O0=z.state.transmissionRenderTarget[t.id],k0=t.viewport||j;O0.setSize(k0.z*R.transmissionResolutionScale,k0.w*R.transmissionResolutionScale);let p0=R.getRenderTarget(),v0=R.getActiveCubeFace(),i0=R.getActiveMipmapLevel();if(R.setRenderTarget(O0),R.getClearColor(m),n=R.getClearAlpha(),n<1)R.setClearColor(16777215,0.5);if(R.clear(),e0)x0.render(r);let r0=R.toneMapping;R.toneMapping=0;let n0=t.viewport;if(t.viewport!==void 0)t.viewport=void 0;if(z.setupLightsView(t),B6===!0)M0.setGlobalState(R.clippingPlanes,t);if(w6(w,r,t),c0.updateMultisampleRenderTarget(O0),c0.updateRenderTargetMipmap(O0),s0.has("WEBGL_multisampled_render_to_texture")===!1){let N0=!1;for(let R6=0,m0=c.length;R6<m0;R6++){let P6=c[R6],E6=P6.object,h0=P6.geometry,y6=P6.material,a=P6.group;if(y6.side===2&&E6.layers.test(t.layers)){let K0=y6.side;y6.side=1,y6.needsUpdate=!0,P$(E6,r,t,h0,y6,a),y6.side=K0,y6.needsUpdate=!0,N0=!0}}if(N0===!0)c0.updateMultisampleRenderTarget(O0),c0.updateRenderTargetMipmap(O0)}if(R.setRenderTarget(p0,v0,i0),R.setClearColor(m,n),n0!==void 0)t.viewport=n0;R.toneMapping=r0}function w6(w,c,r){let t=c.isScene===!0?c.overrideMaterial:null;for(let i=0,O0=w.length;i<O0;i++){let k0=w[i],p0=k0.object,v0=k0.geometry,i0=k0.group,r0=k0.material;if(r0.allowOverride===!0&&t!==null)r0=t;if(p0.layers.test(r.layers))P$(p0,c,r,v0,r0,i0)}}function P$(w,c,r,t,i,O0){if(w.onBeforeRender(R,c,r,t,i,O0),w.modelViewMatrix.multiplyMatrices(r.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),i.onBeforeRender(R,c,r,t,w,O0),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1)i.side=1,i.needsUpdate=!0,R.renderBufferDirect(r,c,t,i,w,O0),i.side=0,i.needsUpdate=!0,R.renderBufferDirect(r,c,t,i,w,O0),i.side=2;else R.renderBufferDirect(r,c,t,i,w,O0);w.onAfterRender(R,c,r,t,i,O0)}function J7(w,c,r){if(c.isScene!==!0)c=z0;let t=w0.get(w),i=z.state.lights,O0=z.state.shadowsArray,k0=i.state.version,p0=u.getParameters(w,i.state,O0,c,r),v0=u.getProgramCacheKey(p0),i0=t.programs;if(t.environment=w.isMeshStandardMaterial?c.environment:null,t.fog=c.fog,t.envMap=(w.isMeshStandardMaterial?C6:X6).get(w.envMap||t.environment),t.envMapRotation=t.environment!==null&&w.envMap===null?c.environmentRotation:w.envMapRotation,i0===void 0)w.addEventListener("dispose",L0),i0=new Map,t.programs=i0;let r0=i0.get(v0);if(r0!==void 0){if(t.currentProgram===r0&&t.lightsStateVersion===k0)return P8(w,p0),r0}else p0.uniforms=u.getUniforms(w),w.onBeforeCompile(p0,R),r0=u.acquireProgram(p0,v0),i0.set(v0,r0),t.uniforms=p0.uniforms;let n0=t.uniforms;if(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)n0.clippingPlanes=M0.uniform;if(P8(w,p0),t.needsLights=O5(w),t.lightsStateVersion=k0,t.needsLights)n0.ambientLightColor.value=i.state.ambient,n0.lightProbe.value=i.state.probe,n0.directionalLights.value=i.state.directional,n0.directionalLightShadows.value=i.state.directionalShadow,n0.spotLights.value=i.state.spot,n0.spotLightShadows.value=i.state.spotShadow,n0.rectAreaLights.value=i.state.rectArea,n0.ltc_1.value=i.state.rectAreaLTC1,n0.ltc_2.value=i.state.rectAreaLTC2,n0.pointLights.value=i.state.point,n0.pointLightShadows.value=i.state.pointShadow,n0.hemisphereLights.value=i.state.hemi,n0.directionalShadowMap.value=i.state.directionalShadowMap,n0.directionalShadowMatrix.value=i.state.directionalShadowMatrix,n0.spotShadowMap.value=i.state.spotShadowMap,n0.spotLightMatrix.value=i.state.spotLightMatrix,n0.spotLightMap.value=i.state.spotLightMap,n0.pointShadowMap.value=i.state.pointShadowMap,n0.pointShadowMatrix.value=i.state.pointShadowMatrix;return t.currentProgram=r0,t.uniformsList=null,r0}function f8(w){if(w.uniformsList===null){let c=w.currentProgram.getUniforms();w.uniformsList=c5.seqWithValue(c.seq,w.uniforms)}return w.uniformsList}function P8(w,c){let r=w0.get(w);r.outputColorSpace=c.outputColorSpace,r.batching=c.batching,r.batchingColor=c.batchingColor,r.instancing=c.instancing,r.instancingColor=c.instancingColor,r.instancingMorph=c.instancingMorph,r.skinning=c.skinning,r.morphTargets=c.morphTargets,r.morphNormals=c.morphNormals,r.morphColors=c.morphColors,r.morphTargetsCount=c.morphTargetsCount,r.numClippingPlanes=c.numClippingPlanes,r.numIntersection=c.numClipIntersection,r.vertexAlphas=c.vertexAlphas,r.vertexTangents=c.vertexTangents,r.toneMapping=c.toneMapping}function g8(w,c,r,t,i){if(c.isScene!==!0)c=z0;c0.resetTextureUnits();let O0=c.fog,k0=t.isMeshStandardMaterial?c.environment:null,p0=M===null?R.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:"srgb-linear",v0=(t.isMeshStandardMaterial?C6:X6).get(t.envMap||k0),i0=t.vertexColors===!0&&!!r.attributes.color&&r.attributes.color.itemSize===4,r0=!!r.attributes.tangent&&(!!t.normalMap||t.anisotropy>0),n0=!!r.morphAttributes.position,N0=!!r.morphAttributes.normal,R6=!!r.morphAttributes.color,m0=0;if(t.toneMapped){if(M===null||M.isXRRenderTarget===!0)m0=R.toneMapping}let P6=r.morphAttributes.position||r.morphAttributes.normal||r.morphAttributes.color,E6=P6!==void 0?P6.length:0,h0=w0.get(t),y6=z.state.lights;if(B6===!0){if(q0===!0||w!==A){let b6=w===A&&t.id===p;M0.setState(t,w,b6)}}let a=!1;if(t.version===h0.__version){if(h0.needsLights&&h0.lightsStateVersion!==y6.state.version)a=!0;else if(h0.outputColorSpace!==p0)a=!0;else if(i.isBatchedMesh&&h0.batching===!1)a=!0;else if(!i.isBatchedMesh&&h0.batching===!0)a=!0;else if(i.isBatchedMesh&&h0.batchingColor===!0&&i.colorTexture===null)a=!0;else if(i.isBatchedMesh&&h0.batchingColor===!1&&i.colorTexture!==null)a=!0;else if(i.isInstancedMesh&&h0.instancing===!1)a=!0;else if(!i.isInstancedMesh&&h0.instancing===!0)a=!0;else if(i.isSkinnedMesh&&h0.skinning===!1)a=!0;else if(!i.isSkinnedMesh&&h0.skinning===!0)a=!0;else if(i.isInstancedMesh&&h0.instancingColor===!0&&i.instanceColor===null)a=!0;else if(i.isInstancedMesh&&h0.instancingColor===!1&&i.instanceColor!==null)a=!0;else if(i.isInstancedMesh&&h0.instancingMorph===!0&&i.morphTexture===null)a=!0;else if(i.isInstancedMesh&&h0.instancingMorph===!1&&i.morphTexture!==null)a=!0;else if(h0.envMap!==v0)a=!0;else if(t.fog===!0&&h0.fog!==O0)a=!0;else if(h0.numClippingPlanes!==void 0&&(h0.numClippingPlanes!==M0.numPlanes||h0.numIntersection!==M0.numIntersection))a=!0;else if(h0.vertexAlphas!==i0)a=!0;else if(h0.vertexTangents!==r0)a=!0;else if(h0.morphTargets!==n0)a=!0;else if(h0.morphNormals!==N0)a=!0;else if(h0.morphColors!==R6)a=!0;else if(h0.toneMapping!==m0)a=!0;else if(h0.morphTargetsCount!==E6)a=!0}else a=!0,h0.__version=t.version;let K0=h0.currentProgram;if(a===!0)K0=J7(t,c,i);let a7=!1,e6=!1,p8=!1,k6=K0.getUniforms(),N7=h0.uniforms;if(g0.useProgram(K0.program))a7=!0,e6=!0,p8=!0;if(t.id!==p)p=t.id,e6=!0;if(a7||A!==w){if(g0.buffers.depth.getReversed()&&w.reversedDepth!==!0)w._reversedDepth=!0,w.updateProjectionMatrix();k6.setValue(x,"projectionMatrix",w.projectionMatrix),k6.setValue(x,"viewMatrix",w.matrixWorldInverse);let p6=k6.map.cameraPosition;if(p6!==void 0)p6.setValue(x,A0.setFromMatrixPosition(w.matrixWorld));if(o0.logarithmicDepthBuffer)k6.setValue(x,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2));if(t.isMeshPhongMaterial||t.isMeshToonMaterial||t.isMeshLambertMaterial||t.isMeshBasicMaterial||t.isMeshStandardMaterial||t.isShaderMaterial)k6.setValue(x,"isOrthographic",w.isOrthographicCamera===!0);if(A!==w)A=w,e6=!0,p8=!0}if(i.isSkinnedMesh){k6.setOptional(x,i,"bindMatrix"),k6.setOptional(x,i,"bindMatrixInverse");let b6=i.skeleton;if(b6){if(b6.boneTexture===null)b6.computeBoneTexture();k6.setValue(x,"boneTexture",b6.boneTexture,c0)}}if(i.isBatchedMesh){if(k6.setOptional(x,i,"batchingTexture"),k6.setValue(x,"batchingTexture",i._matricesTexture,c0),k6.setOptional(x,i,"batchingIdTexture"),k6.setValue(x,"batchingIdTexture",i._indirectTexture,c0),k6.setOptional(x,i,"batchingColorTexture"),i._colorsTexture!==null)k6.setValue(x,"batchingColorTexture",i._colorsTexture,c0)}let d6=r.morphAttributes;if(d6.position!==void 0||d6.normal!==void 0||d6.color!==void 0)a0.update(i,r,K0);if(e6||h0.receiveShadow!==i.receiveShadow)h0.receiveShadow=i.receiveShadow,k6.setValue(x,"receiveShadow",i.receiveShadow);if(t.isMeshGouraudMaterial&&t.envMap!==null)N7.envMap.value=v0,N7.flipEnvMap.value=v0.isCubeTexture&&v0.isRenderTargetTexture===!1?-1:1;if(t.isMeshStandardMaterial&&t.envMap===null&&c.environment!==null)N7.envMapIntensity.value=c.environmentIntensity;if(e6){if(k6.setValue(x,"toneMappingExposure",R.toneMappingExposure),h0.needsLights)F5(N7,p8);if(O0&&t.fog===!0)W0.refreshFogUniforms(N7,O0);W0.refreshMaterialUniforms(N7,t,F0,$0,z.state.transmissionRenderTarget[w.id]),c5.upload(x,f8(h0),N7,c0)}if(t.isShaderMaterial&&t.uniformsNeedUpdate===!0)c5.upload(x,f8(h0),N7,c0),t.uniformsNeedUpdate=!1;if(t.isSpriteMaterial)k6.setValue(x,"center",i.center);if(k6.setValue(x,"modelViewMatrix",i.modelViewMatrix),k6.setValue(x,"normalMatrix",i.normalMatrix),k6.setValue(x,"modelMatrix",i.matrixWorld),t.isShaderMaterial||t.isRawShaderMaterial){let b6=t.uniformsGroups;for(let p6=0,u8=b6.length;p6<u8;p6++){let F7=b6[p6];T0.update(F7,K0),T0.bind(F7,K0)}}return K0}function F5(w,c){w.ambientLightColor.needsUpdate=c,w.lightProbe.needsUpdate=c,w.directionalLights.needsUpdate=c,w.directionalLightShadows.needsUpdate=c,w.pointLights.needsUpdate=c,w.pointLightShadows.needsUpdate=c,w.spotLights.needsUpdate=c,w.spotLightShadows.needsUpdate=c,w.rectAreaLights.needsUpdate=c,w.hemisphereLights.needsUpdate=c}function O5(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return g},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(w,c,r){let t=w0.get(w);if(t.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,t.__autoAllocateDepthBuffer===!1)t.__useRenderToTexture=!1;w0.get(w.texture).__webglTexture=c,w0.get(w.depthTexture).__webglTexture=t.__autoAllocateDepthBuffer?void 0:r,t.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,c){let r=w0.get(w);r.__webglFramebuffer=c,r.__useDefaultFramebuffer=c===void 0};let WQ=x.createFramebuffer();this.setRenderTarget=function(w,c=0,r=0){M=w,g=c,y=r;let t=!0,i=null,O0=!1,k0=!1;if(w){let v0=w0.get(w);if(v0.__useDefaultFramebuffer!==void 0)g0.bindFramebuffer(x.FRAMEBUFFER,null),t=!1;else if(v0.__webglFramebuffer===void 0)c0.setupRenderTarget(w);else if(v0.__hasExternalTextures)c0.rebindTextures(w,w0.get(w.texture).__webglTexture,w0.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){let n0=w.depthTexture;if(v0.__boundDepthTexture!==n0){if(n0!==null&&w0.has(n0)&&(w.width!==n0.image.width||w.height!==n0.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");c0.setupDepthRenderbuffer(w)}}let i0=w.texture;if(i0.isData3DTexture||i0.isDataArrayTexture||i0.isCompressedArrayTexture)k0=!0;let r0=w0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget){if(Array.isArray(r0[c]))i=r0[c][r];else i=r0[c];O0=!0}else if(w.samples>0&&c0.useMultisampledRTT(w)===!1)i=w0.get(w).__webglMultisampledFramebuffer;else if(Array.isArray(r0))i=r0[r];else i=r0;j.copy(w.viewport),h.copy(w.scissor),l=w.scissorTest}else j.copy(y0).multiplyScalar(F0).floor(),h.copy(u0).multiplyScalar(F0).floor(),l=t0;if(r!==0)i=WQ;if(g0.bindFramebuffer(x.FRAMEBUFFER,i)&&t)g0.drawBuffers(w,i);if(g0.viewport(j),g0.scissor(h),g0.setScissorTest(l),O0){let v0=w0.get(w.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_CUBE_MAP_POSITIVE_X+c,v0.__webglTexture,r)}else if(k0){let v0=c;for(let i0=0;i0<w.textures.length;i0++){let r0=w0.get(w.textures[i0]);x.framebufferTextureLayer(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0+i0,r0.__webglTexture,r,v0)}}else if(w!==null&&r!==0){let v0=w0.get(w.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,v0.__webglTexture,r)}p=-1},this.readRenderTargetPixels=function(w,c,r,t,i,O0,k0,p0=0){if(!(w&&w.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let v0=w0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&k0!==void 0)v0=v0[k0];if(v0){g0.bindFramebuffer(x.FRAMEBUFFER,v0);try{let i0=w.textures[p0],r0=i0.format,n0=i0.type;if(!o0.textureFormatReadable(r0)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!o0.textureTypeReadable(n0)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(c>=0&&c<=w.width-t&&(r>=0&&r<=w.height-i)){if(w.textures.length>1)x.readBuffer(x.COLOR_ATTACHMENT0+p0);x.readPixels(c,r,t,i,U0.convert(r0),U0.convert(n0),O0)}}finally{let i0=M!==null?w0.get(M).__webglFramebuffer:null;g0.bindFramebuffer(x.FRAMEBUFFER,i0)}}},this.readRenderTargetPixelsAsync=async function(w,c,r,t,i,O0,k0,p0=0){if(!(w&&w.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let v0=w0.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&k0!==void 0)v0=v0[k0];if(v0)if(c>=0&&c<=w.width-t&&(r>=0&&r<=w.height-i)){g0.bindFramebuffer(x.FRAMEBUFFER,v0);let i0=w.textures[p0],r0=i0.format,n0=i0.type;if(!o0.textureFormatReadable(r0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!o0.textureTypeReadable(n0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let N0=x.createBuffer();if(x.bindBuffer(x.PIXEL_PACK_BUFFER,N0),x.bufferData(x.PIXEL_PACK_BUFFER,O0.byteLength,x.STREAM_READ),w.textures.length>1)x.readBuffer(x.COLOR_ATTACHMENT0+p0);x.readPixels(c,r,t,i,U0.convert(r0),U0.convert(n0),0);let R6=M!==null?w0.get(M).__webglFramebuffer:null;g0.bindFramebuffer(x.FRAMEBUFFER,R6);let m0=x.fenceSync(x.SYNC_GPU_COMMANDS_COMPLETE,0);return x.flush(),await OX(x,m0,4),x.bindBuffer(x.PIXEL_PACK_BUFFER,N0),x.getBufferSubData(x.PIXEL_PACK_BUFFER,0,O0),x.deleteBuffer(N0),x.deleteSync(m0),O0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,c=null,r=0){let t=Math.pow(2,-r),i=Math.floor(w.image.width*t),O0=Math.floor(w.image.height*t),k0=c!==null?c.x:0,p0=c!==null?c.y:0;c0.setTexture2D(w,0),x.copyTexSubImage2D(x.TEXTURE_2D,r,0,0,k0,p0,i,O0),g0.unbindTexture()};let KQ=x.createFramebuffer(),UQ=x.createFramebuffer();if(this.copyTextureToTexture=function(w,c,r=null,t=null,i=0,O0=null){if(O0===null)if(i!==0)i5("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),O0=i,i=0;else O0=0;let k0,p0,v0,i0,r0,n0,N0,R6,m0,P6=w.isCompressedTexture?w.mipmaps[O0]:w.image;if(r!==null)k0=r.max.x-r.min.x,p0=r.max.y-r.min.y,v0=r.isBox3?r.max.z-r.min.z:1,i0=r.min.x,r0=r.min.y,n0=r.isBox3?r.min.z:0;else{let d6=Math.pow(2,-i);if(k0=Math.floor(P6.width*d6),p0=Math.floor(P6.height*d6),w.isDataArrayTexture)v0=P6.depth;else if(w.isData3DTexture)v0=Math.floor(P6.depth*d6);else v0=1;i0=0,r0=0,n0=0}if(t!==null)N0=t.x,R6=t.y,m0=t.z;else N0=0,R6=0,m0=0;let E6=U0.convert(c.format),h0=U0.convert(c.type),y6;if(c.isData3DTexture)c0.setTexture3D(c,0),y6=x.TEXTURE_3D;else if(c.isDataArrayTexture||c.isCompressedArrayTexture)c0.setTexture2DArray(c,0),y6=x.TEXTURE_2D_ARRAY;else c0.setTexture2D(c,0),y6=x.TEXTURE_2D;x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL,c.flipY),x.pixelStorei(x.UNPACK_PREMULTIPLY_ALPHA_WEBGL,c.premultiplyAlpha),x.pixelStorei(x.UNPACK_ALIGNMENT,c.unpackAlignment);let a=x.getParameter(x.UNPACK_ROW_LENGTH),K0=x.getParameter(x.UNPACK_IMAGE_HEIGHT),a7=x.getParameter(x.UNPACK_SKIP_PIXELS),e6=x.getParameter(x.UNPACK_SKIP_ROWS),p8=x.getParameter(x.UNPACK_SKIP_IMAGES);x.pixelStorei(x.UNPACK_ROW_LENGTH,P6.width),x.pixelStorei(x.UNPACK_IMAGE_HEIGHT,P6.height),x.pixelStorei(x.UNPACK_SKIP_PIXELS,i0),x.pixelStorei(x.UNPACK_SKIP_ROWS,r0),x.pixelStorei(x.UNPACK_SKIP_IMAGES,n0);let k6=w.isDataArrayTexture||w.isData3DTexture,N7=c.isDataArrayTexture||c.isData3DTexture;if(w.isDepthTexture){let d6=w0.get(w),b6=w0.get(c),p6=w0.get(d6.__renderTarget),u8=w0.get(b6.__renderTarget);g0.bindFramebuffer(x.READ_FRAMEBUFFER,p6.__webglFramebuffer),g0.bindFramebuffer(x.DRAW_FRAMEBUFFER,u8.__webglFramebuffer);for(let F7=0;F7<v0;F7++){if(k6)x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,w0.get(w).__webglTexture,i,n0+F7),x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,w0.get(c).__webglTexture,O0,m0+F7);x.blitFramebuffer(i0,r0,k0,p0,N0,R6,k0,p0,x.DEPTH_BUFFER_BIT,x.NEAREST)}g0.bindFramebuffer(x.READ_FRAMEBUFFER,null),g0.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else if(i!==0||w.isRenderTargetTexture||w0.has(w)){let d6=w0.get(w),b6=w0.get(c);g0.bindFramebuffer(x.READ_FRAMEBUFFER,KQ),g0.bindFramebuffer(x.DRAW_FRAMEBUFFER,UQ);for(let p6=0;p6<v0;p6++){if(k6)x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,d6.__webglTexture,i,n0+p6);else x.framebufferTexture2D(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,d6.__webglTexture,i);if(N7)x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,b6.__webglTexture,O0,m0+p6);else x.framebufferTexture2D(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,b6.__webglTexture,O0);if(i!==0)x.blitFramebuffer(i0,r0,k0,p0,N0,R6,k0,p0,x.COLOR_BUFFER_BIT,x.NEAREST);else if(N7)x.copyTexSubImage3D(y6,O0,N0,R6,m0+p6,i0,r0,k0,p0);else x.copyTexSubImage2D(y6,O0,N0,R6,i0,r0,k0,p0)}g0.bindFramebuffer(x.READ_FRAMEBUFFER,null),g0.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else if(N7)if(w.isDataTexture||w.isData3DTexture)x.texSubImage3D(y6,O0,N0,R6,m0,k0,p0,v0,E6,h0,P6.data);else if(c.isCompressedArrayTexture)x.compressedTexSubImage3D(y6,O0,N0,R6,m0,k0,p0,v0,E6,P6.data);else x.texSubImage3D(y6,O0,N0,R6,m0,k0,p0,v0,E6,h0,P6);else if(w.isDataTexture)x.texSubImage2D(x.TEXTURE_2D,O0,N0,R6,k0,p0,E6,h0,P6.data);else if(w.isCompressedTexture)x.compressedTexSubImage2D(x.TEXTURE_2D,O0,N0,R6,P6.width,P6.height,E6,P6.data);else x.texSubImage2D(x.TEXTURE_2D,O0,N0,R6,k0,p0,E6,h0,P6);if(x.pixelStorei(x.UNPACK_ROW_LENGTH,a),x.pixelStorei(x.UNPACK_IMAGE_HEIGHT,K0),x.pixelStorei(x.UNPACK_SKIP_PIXELS,a7),x.pixelStorei(x.UNPACK_SKIP_ROWS,e6),x.pixelStorei(x.UNPACK_SKIP_IMAGES,p8),O0===0&&c.generateMipmaps)x.generateMipmap(y6);g0.unbindTexture()},this.initRenderTarget=function(w){if(w0.get(w).__webglFramebuffer===void 0)c0.setupRenderTarget(w)},this.initTexture=function(w){if(w.isCubeTexture)c0.setTextureCube(w,0);else if(w.isData3DTexture)c0.setTexture3D(w,0);else if(w.isDataArrayTexture||w.isCompressedArrayTexture)c0.setTexture2DArray(w,0);else c0.setTexture2D(w,0);g0.unbindTexture()},this.resetState=function(){g=0,y=0,M=null,g0.reset(),H0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2000}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace($){this._outputColorSpace=$;let J=this.getContext();J.drawingBufferColorSpace=I6._getDrawingBufferColorSpace($),J.unpackColorSpace=I6._getUnpackColorSpace()}}var K7,aW=1234567,m5,i$,NX,V6,f7,d,uQ,rW,lQ,tW,eW,$4,I6,M$,PX=0,zX=0,dQ,t6,S6,UK,G8,A1,YK,J8,v7,n9,T$,k$,v$,S8,A8,J$,y5,i9,s9,Q$,IX,h5,nQ,Q8,iQ,o9,j8,sQ,a9,oQ,_$,_7,DX,CX,w8,r9,I7,J4,Q4,c7,RX=0,Z4,y$,Z8,t9,x5,EX,SX,W4,K4,U4,Y4,AX,h$,aQ,u6,y7,W8,rQ,K8,x$,b$,q4,tQ,eQ,$1,J1,Q1,Z1,qK,M8,e9,U6,U7,jX=0,V8,jJ,Y8,m6,$J,kX=0,j1,w1,x6,vX=0,S7,K1,f$,D7,b5,r6,H7,X4,Z$,JJ,G4,QJ,ZJ,WJ,U1,KJ,V4,UJ,O7,t$,hX,xX=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,bX=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,n7,M1,T8,B4,H4,B7,g$=-90,p$=1,VK,T1,BK,d$,fX,HK,G7,N4,F4,O4,gX,L4,qJ,Y1,P4,q1,FK,_1,s5,z4,pX,DJ,u$,I4,XJ,D4,uX,f5,g5,OK,X1,lX,mX,W$,dX,GJ,MJ,CJ,RJ,C4,p5,VJ,G1,R4,TJ,E4,S4,h1,LK,x1,A4,D1,HJ,NJ,PK,zK,b1,f1,kJ,g1,vJ,p1,u1,o5,l1,m1,d1,IK,DK,CK,EK,c1,SK,X$,n1,o$,AK,$5,G$,a$,q8,oX,U8,wK,i1,l$,MK,TK,kK,a5,V1,M4,T4,vK,_K,k4,u5,B1,yK,hK,yJ,xK,bK,fK,H1,pK,uK,s1="\\[\\]\\.:\\/",aX,o1,rX,tX,eX,$G,JG,QG,ZG,WG,cK,v4,k8,OJ,N1,iK,YG=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,qG=`#ifdef USE_ALPHAHASH
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
#endif`,XG=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,GG=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,VG=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,BG=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,HG=`#ifdef USE_AOMAP
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
#endif`,NG=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,FG=`#ifdef USE_BATCHING
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
#endif`,OG=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,LG=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,PG=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,zG=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,IG=`#ifdef USE_IRIDESCENCE
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
#endif`,DG=`#ifdef USE_BUMPMAP
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
#endif`,CG=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,RG=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,EG=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,SG=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,AG=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,jG=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,wG=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,MG=`#if defined( USE_COLOR_ALPHA )
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
#endif`,TG=`#define PI 3.141592653589793
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
} // validated`,kG=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,vG=`vec3 transformedNormal = objectNormal;
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
#endif`,_G=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,yG=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,hG=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,xG=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,bG="gl_FragColor = linearToOutputTexel( gl_FragColor );",fG=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,gG=`#ifdef USE_ENVMAP
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
#endif`,pG=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,uG=`#ifdef USE_ENVMAP
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
#endif`,lG=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mG=`#ifdef USE_ENVMAP
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
#endif`,dG=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cG=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,nG=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,iG=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,sG=`#ifdef USE_GRADIENTMAP
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
}`,oG=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,aG=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,rG=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,tG=`uniform bool receiveShadow;
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
#endif`,eG=`#ifdef USE_ENVMAP
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
#endif`,$V=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,JV=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,QV=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ZV=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,WV=`PhysicalMaterial material;
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
#endif`,KV=`struct PhysicalMaterial {
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
}`,UV=`
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
#endif`,YV=`#if defined( RE_IndirectDiffuse )
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
#endif`,qV=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,XV=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,GV=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,VV=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,BV=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,HV=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,NV=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,FV=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,OV=`#if defined( USE_POINTS_UV )
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
#endif`,LV=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,PV=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,zV=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,IV=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,DV=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,CV=`#ifdef USE_MORPHTARGETS
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
#endif`,RV=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,EV=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,SV=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,AV=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,jV=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wV=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,MV=`#ifdef USE_NORMALMAP
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
#endif`,TV=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,kV=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,vV=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,_V=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,yV=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,hV=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,xV=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,bV=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,fV=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,gV=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,pV=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,uV=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,lV=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,mV=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,dV=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,cV=`float getShadowMask() {
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
}`,nV=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,iV=`#ifdef USE_SKINNING
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
#endif`,sV=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,oV=`#ifdef USE_SKINNING
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
#endif`,aV=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,rV=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tV=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,eV=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,$B=`#ifdef USE_TRANSMISSION
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
#endif`,JB=`#ifdef USE_TRANSMISSION
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
#endif`,QB=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ZB=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,WB=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,KB=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,UB=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,YB=`uniform sampler2D t2D;
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
}`,qB=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,XB=`#ifdef ENVMAP_TYPE_CUBE
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
}`,GB=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,VB=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,BB=`#include <common>
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
}`,HB=`#if DEPTH_PACKING == 3200
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
}`,NB=`#define DISTANCE
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
}`,FB=`#define DISTANCE
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
}`,OB=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,LB=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,PB=`uniform float scale;
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
}`,zB=`uniform vec3 diffuse;
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
}`,IB=`#include <common>
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
}`,DB=`uniform vec3 diffuse;
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
}`,CB=`#define LAMBERT
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
}`,RB=`#define LAMBERT
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
}`,EB=`#define MATCAP
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
}`,SB=`#define MATCAP
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
}`,AB=`#define NORMAL
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
}`,jB=`#define NORMAL
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
}`,wB=`#define PHONG
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
}`,MB=`#define PHONG
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
}`,TB=`#define STANDARD
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
}`,kB=`#define STANDARD
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
}`,vB=`#define TOON
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
}`,_B=`#define TOON
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
}`,yB=`uniform float size;
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
}`,hB=`uniform vec3 diffuse;
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
}`,xB=`#include <common>
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
}`,bB=`uniform vec3 color;
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
}`,fB=`uniform float rotation;
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
}`,gB=`uniform vec3 diffuse;
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
}`,Y6,_0,d7,LJ,K$,pB,c$=4,h4,q$=20,F1,x4,O1=null,L1=0,P1=0,z1=!1,Y$,m$,b4,iB,aK,u4,rK,tK,eK,l4,m4,d4,c4,n4,I1,d2=37297,c2=0,o4,zJ,$H,JH,ZH,VH=0,PH=0,CH=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,RH=`uniform sampler2D shadow_pass;
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
}`,SH,MH=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,TH=`
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

}`,U3,U$,kH,Q5=4,r1=2,t1,r5,Z5,e1,$Z,JZ,B8,V$,xJ,H8=1001,P7,bJ,fJ,gJ=5,QZ,W5,ZZ,K5,t5,WZ=2,e5=35048,U5=303,pJ,uJ,$9=1015,J9,KZ=0,h8,N8=1016,UZ,YZ,lJ,qZ,mJ,dJ,XZ,GZ=2300,cJ=2301,VZ,BZ,HZ,NZ,s6=1006,nJ=1008,FZ=1007,Y7="srgb-linear",OZ,B$,LZ=2200,PZ=2201,Q9,zZ,F8,O8,H$,j7,L8,IZ=1002,N$=1003,DZ=1005,CZ=1004,iJ=0,RZ=1,sJ,oJ,EZ,Z9=201,W9=205,K9,aJ=2,U9,Y9,Y5,q9,SZ,AZ,x8,q5,rJ=1023,tJ,X9=1000,s7="srgb",eJ,$Q,jZ,wZ,MZ,G9,TZ,kZ,JQ,X5,vZ,G5=2,V9=1,_Z=0,F$,l6,V5,QQ,yZ;var B5=_5(()=>{K7=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],m5=Math.PI/180,i$=180/Math.PI;NX={DEG2RAD:m5,RAD2DEG:i$,generateUUID:b7,clamp:G6,euclideanModulo:S1,mapLinear:tq,inverseLerp:eq,lerp:d5,damp:$X,pingpong:JX,smoothstep:QX,smootherstep:ZX,randInt:WX,randFloat:KX,randFloatSpread:UX,seededRandom:YX,degToRad:qX,radToDeg:XX,isPowerOfTwo:GX,ceilPowerOfTwo:VX,floorPowerOfTwo:BX,setQuaternionFromProperEuler:HX,normalize:M6,denormalize:h7};V6=class V6{constructor($=0,J=0){V6.prototype.isVector2=!0,this.x=$,this.y=J}get width(){return this.x}set width($){this.x=$}get height(){return this.y}set height($){this.y=$}set($,J){return this.x=$,this.y=J,this}setScalar($){return this.x=$,this.y=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y)}copy($){return this.x=$.x,this.y=$.y,this}add($){return this.x+=$.x,this.y+=$.y,this}addScalar($){return this.x+=$,this.y+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this}sub($){return this.x-=$.x,this.y-=$.y,this}subScalar($){return this.x-=$,this.y-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this}multiply($){return this.x*=$.x,this.y*=$.y,this}multiplyScalar($){return this.x*=$,this.y*=$,this}divide($){return this.x/=$.x,this.y/=$.y,this}divideScalar($){return this.multiplyScalar(1/$)}applyMatrix3($){let J=this.x,Q=this.y,Z=$.elements;return this.x=Z[0]*J+Z[3]*Q+Z[6],this.y=Z[1]*J+Z[4]*Q+Z[7],this}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this}clamp($,J){return this.x=G6(this.x,$.x,J.x),this.y=G6(this.y,$.y,J.y),this}clampScalar($,J){return this.x=G6(this.x,$,J),this.y=G6(this.y,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(G6(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot($){return this.x*$.x+this.y*$.y}cross($){return this.x*$.y-this.y*$.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo($){let J=Math.sqrt(this.lengthSq()*$.lengthSq());if(J===0)return Math.PI/2;let Q=this.dot($)/J;return Math.acos(G6(Q,-1,1))}distanceTo($){return Math.sqrt(this.distanceToSquared($))}distanceToSquared($){let J=this.x-$.x,Q=this.y-$.y;return J*J+Q*Q}manhattanDistanceTo($){return Math.abs(this.x-$.x)+Math.abs(this.y-$.y)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this}equals($){return $.x===this.x&&$.y===this.y}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this}rotateAround($,J){let Q=Math.cos(J),Z=Math.sin(J),W=this.x-$.x,K=this.y-$.y;return this.x=W*Q-K*Z+$.x,this.y=W*Z+K*Q+$.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};f7=class f7{constructor($=0,J=0,Q=0,Z=1){this.isQuaternion=!0,this._x=$,this._y=J,this._z=Q,this._w=Z}static slerpFlat($,J,Q,Z,W,K,Y){let q=Q[Z+0],G=Q[Z+1],V=Q[Z+2],H=Q[Z+3],N=W[K+0],O=W[K+1],P=W[K+2],D=W[K+3];if(Y===0){$[J+0]=q,$[J+1]=G,$[J+2]=V,$[J+3]=H;return}if(Y===1){$[J+0]=N,$[J+1]=O,$[J+2]=P,$[J+3]=D;return}if(H!==D||q!==N||G!==O||V!==P){let C=1-Y,z=q*N+G*O+V*P+H*D,L=z>=0?1:-1,T=1-z*z;if(T>Number.EPSILON){let v=Math.sqrt(T),g=Math.atan2(v,z*L);C=Math.sin(C*g)/v,Y=Math.sin(Y*g)/v}let R=Y*L;if(q=q*C+N*R,G=G*C+O*R,V=V*C+P*R,H=H*C+D*R,C===1-Y){let v=1/Math.sqrt(q*q+G*G+V*V+H*H);q*=v,G*=v,V*=v,H*=v}}$[J]=q,$[J+1]=G,$[J+2]=V,$[J+3]=H}static multiplyQuaternionsFlat($,J,Q,Z,W,K){let Y=Q[Z],q=Q[Z+1],G=Q[Z+2],V=Q[Z+3],H=W[K],N=W[K+1],O=W[K+2],P=W[K+3];return $[J]=Y*P+V*H+q*O-G*N,$[J+1]=q*P+V*N+G*H-Y*O,$[J+2]=G*P+V*O+Y*N-q*H,$[J+3]=V*P-Y*H-q*N-G*O,$}get x(){return this._x}set x($){this._x=$,this._onChangeCallback()}get y(){return this._y}set y($){this._y=$,this._onChangeCallback()}get z(){return this._z}set z($){this._z=$,this._onChangeCallback()}get w(){return this._w}set w($){this._w=$,this._onChangeCallback()}set($,J,Q,Z){return this._x=$,this._y=J,this._z=Q,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy($){return this._x=$.x,this._y=$.y,this._z=$.z,this._w=$.w,this._onChangeCallback(),this}setFromEuler($,J=!0){let{_x:Q,_y:Z,_z:W,_order:K}=$,Y=Math.cos,q=Math.sin,G=Y(Q/2),V=Y(Z/2),H=Y(W/2),N=q(Q/2),O=q(Z/2),P=q(W/2);switch(K){case"XYZ":this._x=N*V*H+G*O*P,this._y=G*O*H-N*V*P,this._z=G*V*P+N*O*H,this._w=G*V*H-N*O*P;break;case"YXZ":this._x=N*V*H+G*O*P,this._y=G*O*H-N*V*P,this._z=G*V*P-N*O*H,this._w=G*V*H+N*O*P;break;case"ZXY":this._x=N*V*H-G*O*P,this._y=G*O*H+N*V*P,this._z=G*V*P+N*O*H,this._w=G*V*H-N*O*P;break;case"ZYX":this._x=N*V*H-G*O*P,this._y=G*O*H+N*V*P,this._z=G*V*P-N*O*H,this._w=G*V*H+N*O*P;break;case"YZX":this._x=N*V*H+G*O*P,this._y=G*O*H+N*V*P,this._z=G*V*P-N*O*H,this._w=G*V*H-N*O*P;break;case"XZY":this._x=N*V*H-G*O*P,this._y=G*O*H-N*V*P,this._z=G*V*P+N*O*H,this._w=G*V*H+N*O*P;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+K)}if(J===!0)this._onChangeCallback();return this}setFromAxisAngle($,J){let Q=J/2,Z=Math.sin(Q);return this._x=$.x*Z,this._y=$.y*Z,this._z=$.z*Z,this._w=Math.cos(Q),this._onChangeCallback(),this}setFromRotationMatrix($){let J=$.elements,Q=J[0],Z=J[4],W=J[8],K=J[1],Y=J[5],q=J[9],G=J[2],V=J[6],H=J[10],N=Q+Y+H;if(N>0){let O=0.5/Math.sqrt(N+1);this._w=0.25/O,this._x=(V-q)*O,this._y=(W-G)*O,this._z=(K-Z)*O}else if(Q>Y&&Q>H){let O=2*Math.sqrt(1+Q-Y-H);this._w=(V-q)/O,this._x=0.25*O,this._y=(Z+K)/O,this._z=(W+G)/O}else if(Y>H){let O=2*Math.sqrt(1+Y-Q-H);this._w=(W-G)/O,this._x=(Z+K)/O,this._y=0.25*O,this._z=(q+V)/O}else{let O=2*Math.sqrt(1+H-Q-Y);this._w=(K-Z)/O,this._x=(W+G)/O,this._y=(q+V)/O,this._z=0.25*O}return this._onChangeCallback(),this}setFromUnitVectors($,J){let Q=$.dot(J)+1;if(Q<0.00000001)if(Q=0,Math.abs($.x)>Math.abs($.z))this._x=-$.y,this._y=$.x,this._z=0,this._w=Q;else this._x=0,this._y=-$.z,this._z=$.y,this._w=Q;else this._x=$.y*J.z-$.z*J.y,this._y=$.z*J.x-$.x*J.z,this._z=$.x*J.y-$.y*J.x,this._w=Q;return this.normalize()}angleTo($){return 2*Math.acos(Math.abs(G6(this.dot($),-1,1)))}rotateTowards($,J){let Q=this.angleTo($);if(Q===0)return this;let Z=Math.min(1,J/Q);return this.slerp($,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot($){return this._x*$._x+this._y*$._y+this._z*$._z+this._w*$._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let $=this.length();if($===0)this._x=0,this._y=0,this._z=0,this._w=1;else $=1/$,this._x=this._x*$,this._y=this._y*$,this._z=this._z*$,this._w=this._w*$;return this._onChangeCallback(),this}multiply($){return this.multiplyQuaternions(this,$)}premultiply($){return this.multiplyQuaternions($,this)}multiplyQuaternions($,J){let{_x:Q,_y:Z,_z:W,_w:K}=$,Y=J._x,q=J._y,G=J._z,V=J._w;return this._x=Q*V+K*Y+Z*G-W*q,this._y=Z*V+K*q+W*Y-Q*G,this._z=W*V+K*G+Q*q-Z*Y,this._w=K*V-Q*Y-Z*q-W*G,this._onChangeCallback(),this}slerp($,J){if(J===0)return this;if(J===1)return this.copy($);let Q=this._x,Z=this._y,W=this._z,K=this._w,Y=K*$._w+Q*$._x+Z*$._y+W*$._z;if(Y<0)this._w=-$._w,this._x=-$._x,this._y=-$._y,this._z=-$._z,Y=-Y;else this.copy($);if(Y>=1)return this._w=K,this._x=Q,this._y=Z,this._z=W,this;let q=1-Y*Y;if(q<=Number.EPSILON){let O=1-J;return this._w=O*K+J*this._w,this._x=O*Q+J*this._x,this._y=O*Z+J*this._y,this._z=O*W+J*this._z,this.normalize(),this}let G=Math.sqrt(q),V=Math.atan2(G,Y),H=Math.sin((1-J)*V)/G,N=Math.sin(J*V)/G;return this._w=K*H+this._w*N,this._x=Q*H+this._x*N,this._y=Z*H+this._y*N,this._z=W*H+this._z*N,this._onChangeCallback(),this}slerpQuaternions($,J,Q){return this.copy($).slerp(J,Q)}random(){let $=2*Math.PI*Math.random(),J=2*Math.PI*Math.random(),Q=Math.random(),Z=Math.sqrt(1-Q),W=Math.sqrt(Q);return this.set(Z*Math.sin($),Z*Math.cos($),W*Math.sin(J),W*Math.cos(J))}equals($){return $._x===this._x&&$._y===this._y&&$._z===this._z&&$._w===this._w}fromArray($,J=0){return this._x=$[J],this._y=$[J+1],this._z=$[J+2],this._w=$[J+3],this._onChangeCallback(),this}toArray($=[],J=0){return $[J]=this._x,$[J+1]=this._y,$[J+2]=this._z,$[J+3]=this._w,$}fromBufferAttribute($,J){return this._x=$.getX(J),this._y=$.getY(J),this._z=$.getZ(J),this._w=$.getW(J),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange($){return this._onChangeCallback=$,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}};d=class d{constructor($=0,J=0,Q=0){d.prototype.isVector3=!0,this.x=$,this.y=J,this.z=Q}set($,J,Q){if(Q===void 0)Q=this.z;return this.x=$,this.y=J,this.z=Q,this}setScalar($){return this.x=$,this.y=$,this.z=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setZ($){return this.z=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;case 2:this.z=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy($){return this.x=$.x,this.y=$.y,this.z=$.z,this}add($){return this.x+=$.x,this.y+=$.y,this.z+=$.z,this}addScalar($){return this.x+=$,this.y+=$,this.z+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this.z=$.z+J.z,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this.z+=$.z*J,this}sub($){return this.x-=$.x,this.y-=$.y,this.z-=$.z,this}subScalar($){return this.x-=$,this.y-=$,this.z-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this.z=$.z-J.z,this}multiply($){return this.x*=$.x,this.y*=$.y,this.z*=$.z,this}multiplyScalar($){return this.x*=$,this.y*=$,this.z*=$,this}multiplyVectors($,J){return this.x=$.x*J.x,this.y=$.y*J.y,this.z=$.z*J.z,this}applyEuler($){return this.applyQuaternion(rW.setFromEuler($))}applyAxisAngle($,J){return this.applyQuaternion(rW.setFromAxisAngle($,J))}applyMatrix3($){let J=this.x,Q=this.y,Z=this.z,W=$.elements;return this.x=W[0]*J+W[3]*Q+W[6]*Z,this.y=W[1]*J+W[4]*Q+W[7]*Z,this.z=W[2]*J+W[5]*Q+W[8]*Z,this}applyNormalMatrix($){return this.applyMatrix3($).normalize()}applyMatrix4($){let J=this.x,Q=this.y,Z=this.z,W=$.elements,K=1/(W[3]*J+W[7]*Q+W[11]*Z+W[15]);return this.x=(W[0]*J+W[4]*Q+W[8]*Z+W[12])*K,this.y=(W[1]*J+W[5]*Q+W[9]*Z+W[13])*K,this.z=(W[2]*J+W[6]*Q+W[10]*Z+W[14])*K,this}applyQuaternion($){let J=this.x,Q=this.y,Z=this.z,W=$.x,K=$.y,Y=$.z,q=$.w,G=2*(K*Z-Y*Q),V=2*(Y*J-W*Z),H=2*(W*Q-K*J);return this.x=J+q*G+K*H-Y*V,this.y=Q+q*V+Y*G-W*H,this.z=Z+q*H+W*V-K*G,this}project($){return this.applyMatrix4($.matrixWorldInverse).applyMatrix4($.projectionMatrix)}unproject($){return this.applyMatrix4($.projectionMatrixInverse).applyMatrix4($.matrixWorld)}transformDirection($){let J=this.x,Q=this.y,Z=this.z,W=$.elements;return this.x=W[0]*J+W[4]*Q+W[8]*Z,this.y=W[1]*J+W[5]*Q+W[9]*Z,this.z=W[2]*J+W[6]*Q+W[10]*Z,this.normalize()}divide($){return this.x/=$.x,this.y/=$.y,this.z/=$.z,this}divideScalar($){return this.multiplyScalar(1/$)}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this.z=Math.min(this.z,$.z),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this.z=Math.max(this.z,$.z),this}clamp($,J){return this.x=G6(this.x,$.x,J.x),this.y=G6(this.y,$.y,J.y),this.z=G6(this.z,$.z,J.z),this}clampScalar($,J){return this.x=G6(this.x,$,J),this.y=G6(this.y,$,J),this.z=G6(this.z,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(G6(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot($){return this.x*$.x+this.y*$.y+this.z*$.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this.z+=($.z-this.z)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this.z=$.z+(J.z-$.z)*Q,this}cross($){return this.crossVectors(this,$)}crossVectors($,J){let{x:Q,y:Z,z:W}=$,K=J.x,Y=J.y,q=J.z;return this.x=Z*q-W*Y,this.y=W*K-Q*q,this.z=Q*Y-Z*K,this}projectOnVector($){let J=$.lengthSq();if(J===0)return this.set(0,0,0);let Q=$.dot(this)/J;return this.copy($).multiplyScalar(Q)}projectOnPlane($){return uQ.copy(this).projectOnVector($),this.sub(uQ)}reflect($){return this.sub(uQ.copy($).multiplyScalar(2*this.dot($)))}angleTo($){let J=Math.sqrt(this.lengthSq()*$.lengthSq());if(J===0)return Math.PI/2;let Q=this.dot($)/J;return Math.acos(G6(Q,-1,1))}distanceTo($){return Math.sqrt(this.distanceToSquared($))}distanceToSquared($){let J=this.x-$.x,Q=this.y-$.y,Z=this.z-$.z;return J*J+Q*Q+Z*Z}manhattanDistanceTo($){return Math.abs(this.x-$.x)+Math.abs(this.y-$.y)+Math.abs(this.z-$.z)}setFromSpherical($){return this.setFromSphericalCoords($.radius,$.phi,$.theta)}setFromSphericalCoords($,J,Q){let Z=Math.sin(J)*$;return this.x=Z*Math.sin(Q),this.y=Math.cos(J)*$,this.z=Z*Math.cos(Q),this}setFromCylindrical($){return this.setFromCylindricalCoords($.radius,$.theta,$.y)}setFromCylindricalCoords($,J,Q){return this.x=$*Math.sin(J),this.y=Q,this.z=$*Math.cos(J),this}setFromMatrixPosition($){let J=$.elements;return this.x=J[12],this.y=J[13],this.z=J[14],this}setFromMatrixScale($){let J=this.setFromMatrixColumn($,0).length(),Q=this.setFromMatrixColumn($,1).length(),Z=this.setFromMatrixColumn($,2).length();return this.x=J,this.y=Q,this.z=Z,this}setFromMatrixColumn($,J){return this.fromArray($.elements,J*4)}setFromMatrix3Column($,J){return this.fromArray($.elements,J*3)}setFromEuler($){return this.x=$._x,this.y=$._y,this.z=$._z,this}setFromColor($){return this.x=$.r,this.y=$.g,this.z=$.b,this}equals($){return $.x===this.x&&$.y===this.y&&$.z===this.z}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this.z=$[J+2],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$[J+2]=this.z,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this.z=$.getZ(J),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let $=Math.random()*Math.PI*2,J=Math.random()*2-1,Q=Math.sqrt(1-J*J);return this.x=Q*Math.cos($),this.y=J,this.z=Q*Math.sin($),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};uQ=new d,rW=new f7;lQ=new K6;tW={};eW=new K6().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),$4=new K6().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);I6=LX();dQ=new d;t6=class t6 extends _8{constructor($=t6.DEFAULT_IMAGE,J=t6.DEFAULT_MAPPING,Q=1001,Z=1001,W=1006,K=1008,Y=1023,q=1009,G=t6.DEFAULT_ANISOTROPY,V=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:zX++}),this.uuid=b7(),this.name="",this.source=new SJ($),this.mipmaps=[],this.mapping=J,this.channel=0,this.wrapS=Q,this.wrapT=Z,this.magFilter=W,this.minFilter=K,this.anisotropy=G,this.format=Y,this.internalFormat=null,this.type=q,this.offset=new V6(0,0),this.repeat=new V6(1,1),this.center=new V6(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new K6,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=V,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=$&&$.depth&&$.depth>1?!0:!1,this.pmremVersion=0}get width(){return this.source.getSize(dQ).x}get height(){return this.source.getSize(dQ).y}get depth(){return this.source.getSize(dQ).z}get image(){return this.source.data}set image($=null){this.source.data=$}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange($,J){this.updateRanges.push({start:$,count:J})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy($){return this.name=$.name,this.source=$.source,this.mipmaps=$.mipmaps.slice(0),this.mapping=$.mapping,this.channel=$.channel,this.wrapS=$.wrapS,this.wrapT=$.wrapT,this.magFilter=$.magFilter,this.minFilter=$.minFilter,this.anisotropy=$.anisotropy,this.format=$.format,this.internalFormat=$.internalFormat,this.type=$.type,this.offset.copy($.offset),this.repeat.copy($.repeat),this.center.copy($.center),this.rotation=$.rotation,this.matrixAutoUpdate=$.matrixAutoUpdate,this.matrix.copy($.matrix),this.generateMipmaps=$.generateMipmaps,this.premultiplyAlpha=$.premultiplyAlpha,this.flipY=$.flipY,this.unpackAlignment=$.unpackAlignment,this.colorSpace=$.colorSpace,this.renderTarget=$.renderTarget,this.isRenderTargetTexture=$.isRenderTargetTexture,this.isArrayTexture=$.isArrayTexture,this.userData=JSON.parse(JSON.stringify($.userData)),this.needsUpdate=!0,this}setValues($){for(let J in $){let Q=$[J];if(Q===void 0){console.warn(`THREE.Texture.setValues(): parameter '${J}' has value of undefined.`);continue}let Z=this[J];if(Z===void 0){console.warn(`THREE.Texture.setValues(): property '${J}' does not exist.`);continue}if(Z&&Q&&(Z.isVector2&&Q.isVector2))Z.copy(Q);else if(Z&&Q&&(Z.isVector3&&Q.isVector3))Z.copy(Q);else if(Z&&Q&&(Z.isMatrix3&&Q.isMatrix3))Z.copy(Q);else this[J]=Q}}toJSON($){let J=$===void 0||typeof $==="string";if(!J&&$.textures[this.uuid]!==void 0)return $.textures[this.uuid];let Q={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON($).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)Q.userData=this.userData;if(!J)$.textures[this.uuid]=Q;return Q}dispose(){this.dispatchEvent({type:"dispose"})}transformUv($){if(this.mapping!==300)return $;if($.applyMatrix3(this.matrix),$.x<0||$.x>1)switch(this.wrapS){case 1000:$.x=$.x-Math.floor($.x);break;case 1001:$.x=$.x<0?0:1;break;case 1002:if(Math.abs(Math.floor($.x)%2)===1)$.x=Math.ceil($.x)-$.x;else $.x=$.x-Math.floor($.x);break}if($.y<0||$.y>1)switch(this.wrapT){case 1000:$.y=$.y-Math.floor($.y);break;case 1001:$.y=$.y<0?0:1;break;case 1002:if(Math.abs(Math.floor($.y)%2)===1)$.y=Math.ceil($.y)-$.y;else $.y=$.y-Math.floor($.y);break}if(this.flipY)$.y=1-$.y;return $}set needsUpdate($){if($===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate($){if($===!0)this.pmremVersion++}};t6.DEFAULT_IMAGE=null;t6.DEFAULT_MAPPING=300;t6.DEFAULT_ANISOTROPY=1;S6=class S6{constructor($=0,J=0,Q=0,Z=1){S6.prototype.isVector4=!0,this.x=$,this.y=J,this.z=Q,this.w=Z}get width(){return this.z}set width($){this.z=$}get height(){return this.w}set height($){this.w=$}set($,J,Q,Z){return this.x=$,this.y=J,this.z=Q,this.w=Z,this}setScalar($){return this.x=$,this.y=$,this.z=$,this.w=$,this}setX($){return this.x=$,this}setY($){return this.y=$,this}setZ($){return this.z=$,this}setW($){return this.w=$,this}setComponent($,J){switch($){case 0:this.x=J;break;case 1:this.y=J;break;case 2:this.z=J;break;case 3:this.w=J;break;default:throw Error("index is out of range: "+$)}return this}getComponent($){switch($){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+$)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy($){return this.x=$.x,this.y=$.y,this.z=$.z,this.w=$.w!==void 0?$.w:1,this}add($){return this.x+=$.x,this.y+=$.y,this.z+=$.z,this.w+=$.w,this}addScalar($){return this.x+=$,this.y+=$,this.z+=$,this.w+=$,this}addVectors($,J){return this.x=$.x+J.x,this.y=$.y+J.y,this.z=$.z+J.z,this.w=$.w+J.w,this}addScaledVector($,J){return this.x+=$.x*J,this.y+=$.y*J,this.z+=$.z*J,this.w+=$.w*J,this}sub($){return this.x-=$.x,this.y-=$.y,this.z-=$.z,this.w-=$.w,this}subScalar($){return this.x-=$,this.y-=$,this.z-=$,this.w-=$,this}subVectors($,J){return this.x=$.x-J.x,this.y=$.y-J.y,this.z=$.z-J.z,this.w=$.w-J.w,this}multiply($){return this.x*=$.x,this.y*=$.y,this.z*=$.z,this.w*=$.w,this}multiplyScalar($){return this.x*=$,this.y*=$,this.z*=$,this.w*=$,this}applyMatrix4($){let J=this.x,Q=this.y,Z=this.z,W=this.w,K=$.elements;return this.x=K[0]*J+K[4]*Q+K[8]*Z+K[12]*W,this.y=K[1]*J+K[5]*Q+K[9]*Z+K[13]*W,this.z=K[2]*J+K[6]*Q+K[10]*Z+K[14]*W,this.w=K[3]*J+K[7]*Q+K[11]*Z+K[15]*W,this}divide($){return this.x/=$.x,this.y/=$.y,this.z/=$.z,this.w/=$.w,this}divideScalar($){return this.multiplyScalar(1/$)}setAxisAngleFromQuaternion($){this.w=2*Math.acos($.w);let J=Math.sqrt(1-$.w*$.w);if(J<0.0001)this.x=1,this.y=0,this.z=0;else this.x=$.x/J,this.y=$.y/J,this.z=$.z/J;return this}setAxisAngleFromRotationMatrix($){let J,Q,Z,W,K=0.01,Y=0.1,q=$.elements,G=q[0],V=q[4],H=q[8],N=q[1],O=q[5],P=q[9],D=q[2],C=q[6],z=q[10];if(Math.abs(V-N)<0.01&&Math.abs(H-D)<0.01&&Math.abs(P-C)<0.01){if(Math.abs(V+N)<0.1&&Math.abs(H+D)<0.1&&Math.abs(P+C)<0.1&&Math.abs(G+O+z-3)<0.1)return this.set(1,0,0,0),this;J=Math.PI;let T=(G+1)/2,R=(O+1)/2,v=(z+1)/2,g=(V+N)/4,y=(H+D)/4,M=(P+C)/4;if(T>R&&T>v)if(T<0.01)Q=0,Z=0.707106781,W=0.707106781;else Q=Math.sqrt(T),Z=g/Q,W=y/Q;else if(R>v)if(R<0.01)Q=0.707106781,Z=0,W=0.707106781;else Z=Math.sqrt(R),Q=g/Z,W=M/Z;else if(v<0.01)Q=0.707106781,Z=0.707106781,W=0;else W=Math.sqrt(v),Q=y/W,Z=M/W;return this.set(Q,Z,W,J),this}let L=Math.sqrt((C-P)*(C-P)+(H-D)*(H-D)+(N-V)*(N-V));if(Math.abs(L)<0.001)L=1;return this.x=(C-P)/L,this.y=(H-D)/L,this.z=(N-V)/L,this.w=Math.acos((G+O+z-1)/2),this}setFromMatrixPosition($){let J=$.elements;return this.x=J[12],this.y=J[13],this.z=J[14],this.w=J[15],this}min($){return this.x=Math.min(this.x,$.x),this.y=Math.min(this.y,$.y),this.z=Math.min(this.z,$.z),this.w=Math.min(this.w,$.w),this}max($){return this.x=Math.max(this.x,$.x),this.y=Math.max(this.y,$.y),this.z=Math.max(this.z,$.z),this.w=Math.max(this.w,$.w),this}clamp($,J){return this.x=G6(this.x,$.x,J.x),this.y=G6(this.y,$.y,J.y),this.z=G6(this.z,$.z,J.z),this.w=G6(this.w,$.w,J.w),this}clampScalar($,J){return this.x=G6(this.x,$,J),this.y=G6(this.y,$,J),this.z=G6(this.z,$,J),this.w=G6(this.w,$,J),this}clampLength($,J){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(G6(Q,$,J))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot($){return this.x*$.x+this.y*$.y+this.z*$.z+this.w*$.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength($){return this.normalize().multiplyScalar($)}lerp($,J){return this.x+=($.x-this.x)*J,this.y+=($.y-this.y)*J,this.z+=($.z-this.z)*J,this.w+=($.w-this.w)*J,this}lerpVectors($,J,Q){return this.x=$.x+(J.x-$.x)*Q,this.y=$.y+(J.y-$.y)*Q,this.z=$.z+(J.z-$.z)*Q,this.w=$.w+(J.w-$.w)*Q,this}equals($){return $.x===this.x&&$.y===this.y&&$.z===this.z&&$.w===this.w}fromArray($,J=0){return this.x=$[J],this.y=$[J+1],this.z=$[J+2],this.w=$[J+3],this}toArray($=[],J=0){return $[J]=this.x,$[J+1]=this.y,$[J+2]=this.z,$[J+3]=this.w,$}fromBufferAttribute($,J){return this.x=$.getX(J),this.y=$.getY(J),this.z=$.getZ(J),this.w=$.getW(J),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};UK=class UK extends _8{constructor($=1,J=1,Q={}){super();Q=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},Q),this.isRenderTarget=!0,this.width=$,this.height=J,this.depth=Q.depth,this.scissor=new S6(0,0,$,J),this.scissorTest=!1,this.viewport=new S6(0,0,$,J);let Z={width:$,height:J,depth:Q.depth},W=new t6(Z);this.textures=[];let K=Q.count;for(let Y=0;Y<K;Y++)this.textures[Y]=W.clone(),this.textures[Y].isRenderTargetTexture=!0,this.textures[Y].renderTarget=this;this._setTextureOptions(Q),this.depthBuffer=Q.depthBuffer,this.stencilBuffer=Q.stencilBuffer,this.resolveDepthBuffer=Q.resolveDepthBuffer,this.resolveStencilBuffer=Q.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=Q.depthTexture,this.samples=Q.samples,this.multiview=Q.multiview}_setTextureOptions($={}){let J={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if($.mapping!==void 0)J.mapping=$.mapping;if($.wrapS!==void 0)J.wrapS=$.wrapS;if($.wrapT!==void 0)J.wrapT=$.wrapT;if($.wrapR!==void 0)J.wrapR=$.wrapR;if($.magFilter!==void 0)J.magFilter=$.magFilter;if($.minFilter!==void 0)J.minFilter=$.minFilter;if($.format!==void 0)J.format=$.format;if($.type!==void 0)J.type=$.type;if($.anisotropy!==void 0)J.anisotropy=$.anisotropy;if($.colorSpace!==void 0)J.colorSpace=$.colorSpace;if($.flipY!==void 0)J.flipY=$.flipY;if($.generateMipmaps!==void 0)J.generateMipmaps=$.generateMipmaps;if($.internalFormat!==void 0)J.internalFormat=$.internalFormat;for(let Q=0;Q<this.textures.length;Q++)this.textures[Q].setValues(J)}get texture(){return this.textures[0]}set texture($){this.textures[0]=$}set depthTexture($){if(this._depthTexture!==null)this._depthTexture.renderTarget=null;if($!==null)$.renderTarget=this;this._depthTexture=$}get depthTexture(){return this._depthTexture}setSize($,J,Q=1){if(this.width!==$||this.height!==J||this.depth!==Q){this.width=$,this.height=J,this.depth=Q;for(let Z=0,W=this.textures.length;Z<W;Z++)this.textures[Z].image.width=$,this.textures[Z].image.height=J,this.textures[Z].image.depth=Q,this.textures[Z].isArrayTexture=this.textures[Z].image.depth>1;this.dispose()}this.viewport.set(0,0,$,J),this.scissor.set(0,0,$,J)}clone(){return new this.constructor().copy(this)}copy($){this.width=$.width,this.height=$.height,this.depth=$.depth,this.scissor.copy($.scissor),this.scissorTest=$.scissorTest,this.viewport.copy($.viewport),this.textures.length=0;for(let J=0,Q=$.textures.length;J<Q;J++){this.textures[J]=$.textures[J].clone(),this.textures[J].isRenderTargetTexture=!0,this.textures[J].renderTarget=this;let Z=Object.assign({},$.textures[J].image);this.textures[J].source=new SJ(Z)}if(this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,$.depthTexture!==null)this.depthTexture=$.depthTexture.clone();return this.samples=$.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}};G8=class G8 extends UK{constructor($=1,J=1,Q={}){super($,J,Q);this.isWebGLRenderTarget=!0}};A1=class A1 extends t6{constructor($=null,J=1,Q=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:$,width:J,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate($){this.layerUpdates.add($)}clearLayerUpdates(){this.layerUpdates.clear()}};YK=class YK extends t6{constructor($=null,J=1,Q=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:$,width:J,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};J8=[new d,new d,new d,new d,new d,new d,new d,new d],v7=new d,n9=new i7,T$=new d,k$=new d,v$=new d,S8=new d,A8=new d,J$=new d,y5=new d,i9=new d,s9=new d,Q$=new d;IX=new i7,h5=new d,nQ=new d;Q8=new d,iQ=new d,o9=new d,j8=new d,sQ=new d,a9=new d,oQ=new d;_$=new d,_7=new q6,DX=new d(0,0,0),CX=new d(1,1,1),w8=new d,r9=new d,I7=new d,J4=new q6,Q4=new f7;c7=class c7{constructor($=0,J=0,Q=0,Z=c7.DEFAULT_ORDER){this.isEuler=!0,this._x=$,this._y=J,this._z=Q,this._order=Z}get x(){return this._x}set x($){this._x=$,this._onChangeCallback()}get y(){return this._y}set y($){this._y=$,this._onChangeCallback()}get z(){return this._z}set z($){this._z=$,this._onChangeCallback()}get order(){return this._order}set order($){this._order=$,this._onChangeCallback()}set($,J,Q,Z=this._order){return this._x=$,this._y=J,this._z=Q,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy($){return this._x=$._x,this._y=$._y,this._z=$._z,this._order=$._order,this._onChangeCallback(),this}setFromRotationMatrix($,J=this._order,Q=!0){let Z=$.elements,W=Z[0],K=Z[4],Y=Z[8],q=Z[1],G=Z[5],V=Z[9],H=Z[2],N=Z[6],O=Z[10];switch(J){case"XYZ":if(this._y=Math.asin(G6(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-V,O),this._z=Math.atan2(-K,W);else this._x=Math.atan2(N,G),this._z=0;break;case"YXZ":if(this._x=Math.asin(-G6(V,-1,1)),Math.abs(V)<0.9999999)this._y=Math.atan2(Y,O),this._z=Math.atan2(q,G);else this._y=Math.atan2(-H,W),this._z=0;break;case"ZXY":if(this._x=Math.asin(G6(N,-1,1)),Math.abs(N)<0.9999999)this._y=Math.atan2(-H,O),this._z=Math.atan2(-K,G);else this._y=0,this._z=Math.atan2(q,W);break;case"ZYX":if(this._y=Math.asin(-G6(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(N,O),this._z=Math.atan2(q,W);else this._x=0,this._z=Math.atan2(-K,G);break;case"YZX":if(this._z=Math.asin(G6(q,-1,1)),Math.abs(q)<0.9999999)this._x=Math.atan2(-V,G),this._y=Math.atan2(-H,W);else this._x=0,this._y=Math.atan2(Y,O);break;case"XZY":if(this._z=Math.asin(-G6(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(N,G),this._y=Math.atan2(Y,W);else this._x=Math.atan2(-V,O),this._y=0;break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+J)}if(this._order=J,Q===!0)this._onChangeCallback();return this}setFromQuaternion($,J,Q){return J4.makeRotationFromQuaternion($),this.setFromRotationMatrix(J4,J,Q)}setFromVector3($,J=this._order){return this.set($.x,$.y,$.z,J)}reorder($){return Q4.setFromEuler(this),this.setFromQuaternion(Q4,$)}equals($){return $._x===this._x&&$._y===this._y&&$._z===this._z&&$._order===this._order}fromArray($){if(this._x=$[0],this._y=$[1],this._z=$[2],$[3]!==void 0)this._order=$[3];return this._onChangeCallback(),this}toArray($=[],J=0){return $[J]=this._x,$[J+1]=this._y,$[J+2]=this._z,$[J+3]=this._order,$}_onChange($){return this._onChangeCallback=$,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};c7.DEFAULT_ORDER="XYZ";Z4=new d,y$=new f7,Z8=new q6,t9=new d,x5=new d,EX=new d,SX=new f7,W4=new d(1,0,0),K4=new d(0,1,0),U4=new d(0,0,1),Y4={type:"added"},AX={type:"removed"},h$={type:"childadded",child:null},aQ={type:"childremoved",child:null};u6=class u6 extends _8{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:RX++}),this.uuid=b7(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=u6.DEFAULT_UP.clone();let $=new d,J=new c7,Q=new f7,Z=new d(1,1,1);function W(){Q.setFromEuler(J,!1)}function K(){J.setFromQuaternion(Q,void 0,!1)}J._onChange(W),Q._onChange(K),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:$},rotation:{configurable:!0,enumerable:!0,value:J},quaternion:{configurable:!0,enumerable:!0,value:Q},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new q6},normalMatrix:{value:new K6}}),this.matrix=new q6,this.matrixWorld=new q6,this.matrixAutoUpdate=u6.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=u6.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new AJ,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4($){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply($),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion($){return this.quaternion.premultiply($),this}setRotationFromAxisAngle($,J){this.quaternion.setFromAxisAngle($,J)}setRotationFromEuler($){this.quaternion.setFromEuler($,!0)}setRotationFromMatrix($){this.quaternion.setFromRotationMatrix($)}setRotationFromQuaternion($){this.quaternion.copy($)}rotateOnAxis($,J){return y$.setFromAxisAngle($,J),this.quaternion.multiply(y$),this}rotateOnWorldAxis($,J){return y$.setFromAxisAngle($,J),this.quaternion.premultiply(y$),this}rotateX($){return this.rotateOnAxis(W4,$)}rotateY($){return this.rotateOnAxis(K4,$)}rotateZ($){return this.rotateOnAxis(U4,$)}translateOnAxis($,J){return Z4.copy($).applyQuaternion(this.quaternion),this.position.add(Z4.multiplyScalar(J)),this}translateX($){return this.translateOnAxis(W4,$)}translateY($){return this.translateOnAxis(K4,$)}translateZ($){return this.translateOnAxis(U4,$)}localToWorld($){return this.updateWorldMatrix(!0,!1),$.applyMatrix4(this.matrixWorld)}worldToLocal($){return this.updateWorldMatrix(!0,!1),$.applyMatrix4(Z8.copy(this.matrixWorld).invert())}lookAt($,J,Q){if($.isVector3)t9.copy($);else t9.set($,J,Q);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),x5.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)Z8.lookAt(x5,t9,this.up);else Z8.lookAt(t9,x5,this.up);if(this.quaternion.setFromRotationMatrix(Z8),Z)Z8.extractRotation(Z.matrixWorld),y$.setFromRotationMatrix(Z8),this.quaternion.premultiply(y$.invert())}add($){if(arguments.length>1){for(let J=0;J<arguments.length;J++)this.add(arguments[J]);return this}if($===this)return console.error("THREE.Object3D.add: object can't be added as a child of itself.",$),this;if($&&$.isObject3D)$.removeFromParent(),$.parent=this,this.children.push($),$.dispatchEvent(Y4),h$.child=$,this.dispatchEvent(h$),h$.child=null;else console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",$);return this}remove($){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.remove(arguments[Q]);return this}let J=this.children.indexOf($);if(J!==-1)$.parent=null,this.children.splice(J,1),$.dispatchEvent(AX),aQ.child=$,this.dispatchEvent(aQ),aQ.child=null;return this}removeFromParent(){let $=this.parent;if($!==null)$.remove(this);return this}clear(){return this.remove(...this.children)}attach($){if(this.updateWorldMatrix(!0,!1),Z8.copy(this.matrixWorld).invert(),$.parent!==null)$.parent.updateWorldMatrix(!0,!1),Z8.multiply($.parent.matrixWorld);return $.applyMatrix4(Z8),$.removeFromParent(),$.parent=this,this.children.push($),$.updateWorldMatrix(!1,!0),$.dispatchEvent(Y4),h$.child=$,this.dispatchEvent(h$),h$.child=null,this}getObjectById($){return this.getObjectByProperty("id",$)}getObjectByName($){return this.getObjectByProperty("name",$)}getObjectByProperty($,J){if(this[$]===J)return this;for(let Q=0,Z=this.children.length;Q<Z;Q++){let K=this.children[Q].getObjectByProperty($,J);if(K!==void 0)return K}return}getObjectsByProperty($,J,Q=[]){if(this[$]===J)Q.push(this);let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].getObjectsByProperty($,J,Q);return Q}getWorldPosition($){return this.updateWorldMatrix(!0,!1),$.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion($){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(x5,$,EX),$}getWorldScale($){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(x5,SX,$),$}getWorldDirection($){this.updateWorldMatrix(!0,!1);let J=this.matrixWorld.elements;return $.set(J[8],J[9],J[10]).normalize()}raycast(){}traverse($){$(this);let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].traverse($)}traverseVisible($){if(this.visible===!1)return;$(this);let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].traverseVisible($)}traverseAncestors($){let J=this.parent;if(J!==null)$(J),J.traverseAncestors($)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld($){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}let J=this.children;for(let Q=0,Z=J.length;Q<Z;Q++)J[Q].updateMatrixWorld($)}updateWorldMatrix($,J){let Q=this.parent;if($===!0&&Q!==null)Q.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if(J===!0){let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].updateWorldMatrix(!1,!0)}}toJSON($){let J=$===void 0||typeof $==="string",Q={};if(J)$={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},Q.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.geometryInfo=this._geometryInfo.map((Y)=>({...Y,boundingBox:Y.boundingBox?Y.boundingBox.toJSON():void 0,boundingSphere:Y.boundingSphere?Y.boundingSphere.toJSON():void 0})),Z.instanceInfo=this._instanceInfo.map((Y)=>({...Y})),Z.availableInstanceIds=this._availableInstanceIds.slice(),Z.availableGeometryIds=this._availableGeometryIds.slice(),Z.nextIndexStart=this._nextIndexStart,Z.nextVertexStart=this._nextVertexStart,Z.geometryCount=this._geometryCount,Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.matricesTexture=this._matricesTexture.toJSON($),Z.indirectTexture=this._indirectTexture.toJSON($),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON($);if(this.boundingSphere!==null)Z.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)Z.boundingBox=this.boundingBox.toJSON()}function W(Y,q){if(Y[q.uuid]===void 0)Y[q.uuid]=q.toJSON($);return q.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON($).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON($).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=W($.geometries,this.geometry);let Y=this.geometry.parameters;if(Y!==void 0&&Y.shapes!==void 0){let q=Y.shapes;if(Array.isArray(q))for(let G=0,V=q.length;G<V;G++){let H=q[G];W($.shapes,H)}else W($.shapes,q)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)W($.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let Y=[];for(let q=0,G=this.material.length;q<G;q++)Y.push(W($.materials,this.material[q]));Z.material=Y}else Z.material=W($.materials,this.material);if(this.children.length>0){Z.children=[];for(let Y=0;Y<this.children.length;Y++)Z.children.push(this.children[Y].toJSON($).object)}if(this.animations.length>0){Z.animations=[];for(let Y=0;Y<this.animations.length;Y++){let q=this.animations[Y];Z.animations.push(W($.animations,q))}}if(J){let Y=K($.geometries),q=K($.materials),G=K($.textures),V=K($.images),H=K($.shapes),N=K($.skeletons),O=K($.animations),P=K($.nodes);if(Y.length>0)Q.geometries=Y;if(q.length>0)Q.materials=q;if(G.length>0)Q.textures=G;if(V.length>0)Q.images=V;if(H.length>0)Q.shapes=H;if(N.length>0)Q.skeletons=N;if(O.length>0)Q.animations=O;if(P.length>0)Q.nodes=P}return Q.object=Z,Q;function K(Y){let q=[];for(let G in Y){let V=Y[G];delete V.metadata,q.push(V)}return q}}clone($){return new this.constructor().copy(this,$)}copy($,J=!0){if(this.name=$.name,this.up.copy($.up),this.position.copy($.position),this.rotation.order=$.rotation.order,this.quaternion.copy($.quaternion),this.scale.copy($.scale),this.matrix.copy($.matrix),this.matrixWorld.copy($.matrixWorld),this.matrixAutoUpdate=$.matrixAutoUpdate,this.matrixWorldAutoUpdate=$.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=$.matrixWorldNeedsUpdate,this.layers.mask=$.layers.mask,this.visible=$.visible,this.castShadow=$.castShadow,this.receiveShadow=$.receiveShadow,this.frustumCulled=$.frustumCulled,this.renderOrder=$.renderOrder,this.animations=$.animations.slice(),this.userData=JSON.parse(JSON.stringify($.userData)),J===!0)for(let Q=0;Q<$.children.length;Q++){let Z=$.children[Q];this.add(Z.clone())}return this}};u6.DEFAULT_UP=new d(0,1,0);u6.DEFAULT_MATRIX_AUTO_UPDATE=!0;u6.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;y7=new d,W8=new d,rQ=new d,K8=new d,x$=new d,b$=new d,q4=new d,tQ=new d,eQ=new d,$1=new d,J1=new S6,Q1=new S6,Z1=new S6;qK={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},M8={h:0,s:0,l:0},e9={h:0,s:0,l:0};U6=class U6{constructor($,J,Q){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set($,J,Q)}set($,J,Q){if(J===void 0&&Q===void 0){let Z=$;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB($,J,Q);return this}setScalar($){return this.r=$,this.g=$,this.b=$,this}setHex($,J="srgb"){return $=Math.floor($),this.r=($>>16&255)/255,this.g=($>>8&255)/255,this.b=($&255)/255,I6.colorSpaceToWorking(this,J),this}setRGB($,J,Q,Z=I6.workingColorSpace){return this.r=$,this.g=J,this.b=Q,I6.colorSpaceToWorking(this,Z),this}setHSL($,J,Q,Z=I6.workingColorSpace){if($=S1($,1),J=G6(J,0,1),Q=G6(Q,0,1),J===0)this.r=this.g=this.b=Q;else{let W=Q<=0.5?Q*(1+J):Q+J-Q*J,K=2*Q-W;this.r=W1(K,W,$+0.3333333333333333),this.g=W1(K,W,$),this.b=W1(K,W,$-0.3333333333333333)}return I6.colorSpaceToWorking(this,Z),this}setStyle($,J="srgb"){function Q(W){if(W===void 0)return;if(parseFloat(W)<1)console.warn("THREE.Color: Alpha component of "+$+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec($)){let W,K=Z[1],Y=Z[2];switch(K){case"rgb":case"rgba":if(W=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return Q(W[4]),this.setRGB(Math.min(255,parseInt(W[1],10))/255,Math.min(255,parseInt(W[2],10))/255,Math.min(255,parseInt(W[3],10))/255,J);if(W=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return Q(W[4]),this.setRGB(Math.min(100,parseInt(W[1],10))/100,Math.min(100,parseInt(W[2],10))/100,Math.min(100,parseInt(W[3],10))/100,J);break;case"hsl":case"hsla":if(W=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return Q(W[4]),this.setHSL(parseFloat(W[1])/360,parseFloat(W[2])/100,parseFloat(W[3])/100,J);break;default:console.warn("THREE.Color: Unknown color model "+$)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec($)){let W=Z[1],K=W.length;if(K===3)return this.setRGB(parseInt(W.charAt(0),16)/15,parseInt(W.charAt(1),16)/15,parseInt(W.charAt(2),16)/15,J);else if(K===6)return this.setHex(parseInt(W,16),J);else console.warn("THREE.Color: Invalid hex color "+$)}else if($&&$.length>0)return this.setColorName($,J);return this}setColorName($,J="srgb"){let Q=qK[$.toLowerCase()];if(Q!==void 0)this.setHex(Q,J);else console.warn("THREE.Color: Unknown color "+$);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy($){return this.r=$.r,this.g=$.g,this.b=$.b,this}copySRGBToLinear($){return this.r=X8($.r),this.g=X8($.g),this.b=X8($.b),this}copyLinearToSRGB($){return this.r=n$($.r),this.g=n$($.g),this.b=n$($.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex($="srgb"){return I6.workingToColorSpace(U7.copy(this),$),Math.round(G6(U7.r*255,0,255))*65536+Math.round(G6(U7.g*255,0,255))*256+Math.round(G6(U7.b*255,0,255))}getHexString($="srgb"){return("000000"+this.getHex($).toString(16)).slice(-6)}getHSL($,J=I6.workingColorSpace){I6.workingToColorSpace(U7.copy(this),J);let{r:Q,g:Z,b:W}=U7,K=Math.max(Q,Z,W),Y=Math.min(Q,Z,W),q,G,V=(Y+K)/2;if(Y===K)q=0,G=0;else{let H=K-Y;switch(G=V<=0.5?H/(K+Y):H/(2-K-Y),K){case Q:q=(Z-W)/H+(Z<W?6:0);break;case Z:q=(W-Q)/H+2;break;case W:q=(Q-Z)/H+4;break}q/=6}return $.h=q,$.s=G,$.l=V,$}getRGB($,J=I6.workingColorSpace){return I6.workingToColorSpace(U7.copy(this),J),$.r=U7.r,$.g=U7.g,$.b=U7.b,$}getStyle($="srgb"){I6.workingToColorSpace(U7.copy(this),$);let{r:J,g:Q,b:Z}=U7;if($!=="srgb")return`color(${$} ${J.toFixed(3)} ${Q.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round(J*255)},${Math.round(Q*255)},${Math.round(Z*255)})`}offsetHSL($,J,Q){return this.getHSL(M8),this.setHSL(M8.h+$,M8.s+J,M8.l+Q)}add($){return this.r+=$.r,this.g+=$.g,this.b+=$.b,this}addColors($,J){return this.r=$.r+J.r,this.g=$.g+J.g,this.b=$.b+J.b,this}addScalar($){return this.r+=$,this.g+=$,this.b+=$,this}sub($){return this.r=Math.max(0,this.r-$.r),this.g=Math.max(0,this.g-$.g),this.b=Math.max(0,this.b-$.b),this}multiply($){return this.r*=$.r,this.g*=$.g,this.b*=$.b,this}multiplyScalar($){return this.r*=$,this.g*=$,this.b*=$,this}lerp($,J){return this.r+=($.r-this.r)*J,this.g+=($.g-this.g)*J,this.b+=($.b-this.b)*J,this}lerpColors($,J,Q){return this.r=$.r+(J.r-$.r)*Q,this.g=$.g+(J.g-$.g)*Q,this.b=$.b+(J.b-$.b)*Q,this}lerpHSL($,J){this.getHSL(M8),$.getHSL(e9);let Q=d5(M8.h,e9.h,J),Z=d5(M8.s,e9.s,J),W=d5(M8.l,e9.l,J);return this.setHSL(Q,Z,W),this}setFromVector3($){return this.r=$.x,this.g=$.y,this.b=$.z,this}applyMatrix3($){let J=this.r,Q=this.g,Z=this.b,W=$.elements;return this.r=W[0]*J+W[3]*Q+W[6]*Z,this.g=W[1]*J+W[4]*Q+W[7]*Z,this.b=W[2]*J+W[5]*Q+W[8]*Z,this}equals($){return $.r===this.r&&$.g===this.g&&$.b===this.b}fromArray($,J=0){return this.r=$[J],this.g=$[J+1],this.b=$[J+2],this}toArray($=[],J=0){return $[J]=this.r,$[J+1]=this.g,$[J+2]=this.b,$}fromBufferAttribute($,J){return this.r=$.getX(J),this.g=$.getY(J),this.b=$.getZ(J),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}};U7=new U6;U6.NAMES=qK;V8=class V8 extends _8{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:jX++}),this.uuid=b7(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new U6(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest($){if(this._alphaTest>0!==$>0)this.version++;this._alphaTest=$}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues($){if($===void 0)return;for(let J in $){let Q=$[J];if(Q===void 0){console.warn(`THREE.Material: parameter '${J}' has value of undefined.`);continue}let Z=this[J];if(Z===void 0){console.warn(`THREE.Material: '${J}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set(Q);else if(Z&&Z.isVector3&&(Q&&Q.isVector3))Z.copy(Q);else this[J]=Q}}toJSON($){let J=$===void 0||typeof $==="string";if(J)$={textures:{},images:{}};let Q={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if(Q.uuid=this.uuid,Q.type=this.type,this.name!=="")Q.name=this.name;if(this.color&&this.color.isColor)Q.color=this.color.getHex();if(this.roughness!==void 0)Q.roughness=this.roughness;if(this.metalness!==void 0)Q.metalness=this.metalness;if(this.sheen!==void 0)Q.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)Q.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)Q.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)Q.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)Q.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)Q.specular=this.specular.getHex();if(this.specularIntensity!==void 0)Q.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)Q.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)Q.shininess=this.shininess;if(this.clearcoat!==void 0)Q.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)Q.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)Q.clearcoatMap=this.clearcoatMap.toJSON($).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)Q.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON($).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)Q.clearcoatNormalMap=this.clearcoatNormalMap.toJSON($).uuid,Q.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)Q.sheenColorMap=this.sheenColorMap.toJSON($).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)Q.sheenRoughnessMap=this.sheenRoughnessMap.toJSON($).uuid;if(this.dispersion!==void 0)Q.dispersion=this.dispersion;if(this.iridescence!==void 0)Q.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)Q.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)Q.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)Q.iridescenceMap=this.iridescenceMap.toJSON($).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)Q.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON($).uuid;if(this.anisotropy!==void 0)Q.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)Q.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)Q.anisotropyMap=this.anisotropyMap.toJSON($).uuid;if(this.map&&this.map.isTexture)Q.map=this.map.toJSON($).uuid;if(this.matcap&&this.matcap.isTexture)Q.matcap=this.matcap.toJSON($).uuid;if(this.alphaMap&&this.alphaMap.isTexture)Q.alphaMap=this.alphaMap.toJSON($).uuid;if(this.lightMap&&this.lightMap.isTexture)Q.lightMap=this.lightMap.toJSON($).uuid,Q.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)Q.aoMap=this.aoMap.toJSON($).uuid,Q.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)Q.bumpMap=this.bumpMap.toJSON($).uuid,Q.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)Q.normalMap=this.normalMap.toJSON($).uuid,Q.normalMapType=this.normalMapType,Q.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)Q.displacementMap=this.displacementMap.toJSON($).uuid,Q.displacementScale=this.displacementScale,Q.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)Q.roughnessMap=this.roughnessMap.toJSON($).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)Q.metalnessMap=this.metalnessMap.toJSON($).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)Q.emissiveMap=this.emissiveMap.toJSON($).uuid;if(this.specularMap&&this.specularMap.isTexture)Q.specularMap=this.specularMap.toJSON($).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)Q.specularIntensityMap=this.specularIntensityMap.toJSON($).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)Q.specularColorMap=this.specularColorMap.toJSON($).uuid;if(this.envMap&&this.envMap.isTexture){if(Q.envMap=this.envMap.toJSON($).uuid,this.combine!==void 0)Q.combine=this.combine}if(this.envMapRotation!==void 0)Q.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)Q.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)Q.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)Q.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)Q.gradientMap=this.gradientMap.toJSON($).uuid;if(this.transmission!==void 0)Q.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)Q.transmissionMap=this.transmissionMap.toJSON($).uuid;if(this.thickness!==void 0)Q.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)Q.thicknessMap=this.thicknessMap.toJSON($).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)Q.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)Q.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)Q.size=this.size;if(this.shadowSide!==null)Q.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)Q.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)Q.blending=this.blending;if(this.side!==0)Q.side=this.side;if(this.vertexColors===!0)Q.vertexColors=!0;if(this.opacity<1)Q.opacity=this.opacity;if(this.transparent===!0)Q.transparent=!0;if(this.blendSrc!==204)Q.blendSrc=this.blendSrc;if(this.blendDst!==205)Q.blendDst=this.blendDst;if(this.blendEquation!==100)Q.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)Q.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)Q.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)Q.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)Q.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)Q.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)Q.depthFunc=this.depthFunc;if(this.depthTest===!1)Q.depthTest=this.depthTest;if(this.depthWrite===!1)Q.depthWrite=this.depthWrite;if(this.colorWrite===!1)Q.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)Q.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)Q.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)Q.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)Q.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)Q.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)Q.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)Q.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)Q.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)Q.rotation=this.rotation;if(this.polygonOffset===!0)Q.polygonOffset=!0;if(this.polygonOffsetFactor!==0)Q.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)Q.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)Q.linewidth=this.linewidth;if(this.dashSize!==void 0)Q.dashSize=this.dashSize;if(this.gapSize!==void 0)Q.gapSize=this.gapSize;if(this.scale!==void 0)Q.scale=this.scale;if(this.dithering===!0)Q.dithering=!0;if(this.alphaTest>0)Q.alphaTest=this.alphaTest;if(this.alphaHash===!0)Q.alphaHash=!0;if(this.alphaToCoverage===!0)Q.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)Q.premultipliedAlpha=!0;if(this.forceSinglePass===!0)Q.forceSinglePass=!0;if(this.wireframe===!0)Q.wireframe=!0;if(this.wireframeLinewidth>1)Q.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")Q.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")Q.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)Q.flatShading=!0;if(this.visible===!1)Q.visible=!1;if(this.toneMapped===!1)Q.toneMapped=!1;if(this.fog===!1)Q.fog=!1;if(Object.keys(this.userData).length>0)Q.userData=this.userData;function Z(W){let K=[];for(let Y in W){let q=W[Y];delete q.metadata,K.push(q)}return K}if(J){let W=Z($.textures),K=Z($.images);if(W.length>0)Q.textures=W;if(K.length>0)Q.images=K}return Q}clone(){return new this.constructor().copy(this)}copy($){this.name=$.name,this.blending=$.blending,this.side=$.side,this.vertexColors=$.vertexColors,this.opacity=$.opacity,this.transparent=$.transparent,this.blendSrc=$.blendSrc,this.blendDst=$.blendDst,this.blendEquation=$.blendEquation,this.blendSrcAlpha=$.blendSrcAlpha,this.blendDstAlpha=$.blendDstAlpha,this.blendEquationAlpha=$.blendEquationAlpha,this.blendColor.copy($.blendColor),this.blendAlpha=$.blendAlpha,this.depthFunc=$.depthFunc,this.depthTest=$.depthTest,this.depthWrite=$.depthWrite,this.stencilWriteMask=$.stencilWriteMask,this.stencilFunc=$.stencilFunc,this.stencilRef=$.stencilRef,this.stencilFuncMask=$.stencilFuncMask,this.stencilFail=$.stencilFail,this.stencilZFail=$.stencilZFail,this.stencilZPass=$.stencilZPass,this.stencilWrite=$.stencilWrite;let J=$.clippingPlanes,Q=null;if(J!==null){let Z=J.length;Q=Array(Z);for(let W=0;W!==Z;++W)Q[W]=J[W].clone()}return this.clippingPlanes=Q,this.clipIntersection=$.clipIntersection,this.clipShadows=$.clipShadows,this.shadowSide=$.shadowSide,this.colorWrite=$.colorWrite,this.precision=$.precision,this.polygonOffset=$.polygonOffset,this.polygonOffsetFactor=$.polygonOffsetFactor,this.polygonOffsetUnits=$.polygonOffsetUnits,this.dithering=$.dithering,this.alphaTest=$.alphaTest,this.alphaHash=$.alphaHash,this.alphaToCoverage=$.alphaToCoverage,this.premultipliedAlpha=$.premultipliedAlpha,this.forceSinglePass=$.forceSinglePass,this.visible=$.visible,this.toneMapped=$.toneMapped,this.userData=JSON.parse(JSON.stringify($.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate($){if($===!0)this.version++}};jJ=class jJ extends V8{constructor($){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new U6(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c7,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.specularMap=$.specularMap,this.alphaMap=$.alphaMap,this.envMap=$.envMap,this.envMapRotation.copy($.envMapRotation),this.combine=$.combine,this.reflectivity=$.reflectivity,this.refractionRatio=$.refractionRatio,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.fog=$.fog,this}};Y8=wX();m6=new d,$J=new V6;j1=class j1 extends L7{constructor($,J,Q){super(new Uint16Array($),J,Q)}};w1=class w1 extends L7{constructor($,J,Q){super(new Uint32Array($),J,Q)}};x6=class x6 extends L7{constructor($,J,Q){super(new Float32Array($),J,Q)}};S7=new q6,K1=new u6,f$=new d,D7=new i7,b5=new i7,r6=new d;H7=class H7 extends _8{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:vX++}),this.uuid=b7(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex($){if(Array.isArray($))this.index=new((WK($))?w1:j1)($,1);else this.index=$;return this}setIndirect($){return this.indirect=$,this}getIndirect(){return this.indirect}getAttribute($){return this.attributes[$]}setAttribute($,J){return this.attributes[$]=J,this}deleteAttribute($){return delete this.attributes[$],this}hasAttribute($){return this.attributes[$]!==void 0}addGroup($,J,Q=0){this.groups.push({start:$,count:J,materialIndex:Q})}clearGroups(){this.groups=[]}setDrawRange($,J){this.drawRange.start=$,this.drawRange.count=J}applyMatrix4($){let J=this.attributes.position;if(J!==void 0)J.applyMatrix4($),J.needsUpdate=!0;let Q=this.attributes.normal;if(Q!==void 0){let W=new K6().getNormalMatrix($);Q.applyNormalMatrix(W),Q.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection($),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion($){return S7.makeRotationFromQuaternion($),this.applyMatrix4(S7),this}rotateX($){return S7.makeRotationX($),this.applyMatrix4(S7),this}rotateY($){return S7.makeRotationY($),this.applyMatrix4(S7),this}rotateZ($){return S7.makeRotationZ($),this.applyMatrix4(S7),this}translate($,J,Q){return S7.makeTranslation($,J,Q),this.applyMatrix4(S7),this}scale($,J,Q){return S7.makeScale($,J,Q),this.applyMatrix4(S7),this}lookAt($){return K1.lookAt($),K1.updateMatrix(),this.applyMatrix4(K1.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(f$).negate(),this.translate(f$.x,f$.y,f$.z),this}setFromPoints($){let J=this.getAttribute("position");if(J===void 0){let Q=[];for(let Z=0,W=$.length;Z<W;Z++){let K=$[Z];Q.push(K.x,K.y,K.z||0)}this.setAttribute("position",new x6(Q,3))}else{let Q=Math.min($.length,J.count);for(let Z=0;Z<Q;Z++){let W=$[Z];J.setXYZ(Z,W.x,W.y,W.z||0)}if($.length>J.count)console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");J.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new i7;let $=this.attributes.position,J=this.morphAttributes.position;if($&&$.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new d(-1/0,-1/0,-1/0),new d(1/0,1/0,1/0));return}if($!==void 0){if(this.boundingBox.setFromBufferAttribute($),J)for(let Q=0,Z=J.length;Q<Z;Q++){let W=J[Q];if(D7.setFromBufferAttribute(W),this.morphTargetsRelative)r6.addVectors(this.boundingBox.min,D7.min),this.boundingBox.expandByPoint(r6),r6.addVectors(this.boundingBox.max,D7.max),this.boundingBox.expandByPoint(r6);else this.boundingBox.expandByPoint(D7.min),this.boundingBox.expandByPoint(D7.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new g7;let $=this.attributes.position,J=this.morphAttributes.position;if($&&$.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new d,1/0);return}if($){let Q=this.boundingSphere.center;if(D7.setFromBufferAttribute($),J)for(let W=0,K=J.length;W<K;W++){let Y=J[W];if(b5.setFromBufferAttribute(Y),this.morphTargetsRelative)r6.addVectors(D7.min,b5.min),D7.expandByPoint(r6),r6.addVectors(D7.max,b5.max),D7.expandByPoint(r6);else D7.expandByPoint(b5.min),D7.expandByPoint(b5.max)}D7.getCenter(Q);let Z=0;for(let W=0,K=$.count;W<K;W++)r6.fromBufferAttribute($,W),Z=Math.max(Z,Q.distanceToSquared(r6));if(J)for(let W=0,K=J.length;W<K;W++){let Y=J[W],q=this.morphTargetsRelative;for(let G=0,V=Y.count;G<V;G++){if(r6.fromBufferAttribute(Y,G),q)f$.fromBufferAttribute($,G),r6.add(f$);Z=Math.max(Z,Q.distanceToSquared(r6))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let $=this.index,J=this.attributes;if($===null||J.position===void 0||J.normal===void 0||J.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:Q,normal:Z,uv:W}=J;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new L7(new Float32Array(4*Q.count),4));let K=this.getAttribute("tangent"),Y=[],q=[];for(let M=0;M<Q.count;M++)Y[M]=new d,q[M]=new d;let G=new d,V=new d,H=new d,N=new V6,O=new V6,P=new V6,D=new d,C=new d;function z(M,p,A){G.fromBufferAttribute(Q,M),V.fromBufferAttribute(Q,p),H.fromBufferAttribute(Q,A),N.fromBufferAttribute(W,M),O.fromBufferAttribute(W,p),P.fromBufferAttribute(W,A),V.sub(G),H.sub(G),O.sub(N),P.sub(N);let j=1/(O.x*P.y-P.x*O.y);if(!isFinite(j))return;D.copy(V).multiplyScalar(P.y).addScaledVector(H,-O.y).multiplyScalar(j),C.copy(H).multiplyScalar(O.x).addScaledVector(V,-P.x).multiplyScalar(j),Y[M].add(D),Y[p].add(D),Y[A].add(D),q[M].add(C),q[p].add(C),q[A].add(C)}let L=this.groups;if(L.length===0)L=[{start:0,count:$.count}];for(let M=0,p=L.length;M<p;++M){let A=L[M],j=A.start,h=A.count;for(let l=j,m=j+h;l<m;l+=3)z($.getX(l+0),$.getX(l+1),$.getX(l+2))}let T=new d,R=new d,v=new d,g=new d;function y(M){v.fromBufferAttribute(Z,M),g.copy(v);let p=Y[M];T.copy(p),T.sub(v.multiplyScalar(v.dot(p))).normalize(),R.crossVectors(g,p);let j=R.dot(q[M])<0?-1:1;K.setXYZW(M,T.x,T.y,T.z,j)}for(let M=0,p=L.length;M<p;++M){let A=L[M],j=A.start,h=A.count;for(let l=j,m=j+h;l<m;l+=3)y($.getX(l+0)),y($.getX(l+1)),y($.getX(l+2))}}computeVertexNormals(){let $=this.index,J=this.getAttribute("position");if(J!==void 0){let Q=this.getAttribute("normal");if(Q===void 0)Q=new L7(new Float32Array(J.count*3),3),this.setAttribute("normal",Q);else for(let N=0,O=Q.count;N<O;N++)Q.setXYZ(N,0,0,0);let Z=new d,W=new d,K=new d,Y=new d,q=new d,G=new d,V=new d,H=new d;if($)for(let N=0,O=$.count;N<O;N+=3){let P=$.getX(N+0),D=$.getX(N+1),C=$.getX(N+2);Z.fromBufferAttribute(J,P),W.fromBufferAttribute(J,D),K.fromBufferAttribute(J,C),V.subVectors(K,W),H.subVectors(Z,W),V.cross(H),Y.fromBufferAttribute(Q,P),q.fromBufferAttribute(Q,D),G.fromBufferAttribute(Q,C),Y.add(V),q.add(V),G.add(V),Q.setXYZ(P,Y.x,Y.y,Y.z),Q.setXYZ(D,q.x,q.y,q.z),Q.setXYZ(C,G.x,G.y,G.z)}else for(let N=0,O=J.count;N<O;N+=3)Z.fromBufferAttribute(J,N+0),W.fromBufferAttribute(J,N+1),K.fromBufferAttribute(J,N+2),V.subVectors(K,W),H.subVectors(Z,W),V.cross(H),Q.setXYZ(N+0,V.x,V.y,V.z),Q.setXYZ(N+1,V.x,V.y,V.z),Q.setXYZ(N+2,V.x,V.y,V.z);this.normalizeNormals(),Q.needsUpdate=!0}}normalizeNormals(){let $=this.attributes.normal;for(let J=0,Q=$.count;J<Q;J++)r6.fromBufferAttribute($,J),r6.normalize(),$.setXYZ(J,r6.x,r6.y,r6.z)}toNonIndexed(){function $(Y,q){let{array:G,itemSize:V,normalized:H}=Y,N=new G.constructor(q.length*V),O=0,P=0;for(let D=0,C=q.length;D<C;D++){if(Y.isInterleavedBufferAttribute)O=q[D]*Y.data.stride+Y.offset;else O=q[D]*V;for(let z=0;z<V;z++)N[P++]=G[O++]}return new L7(N,V,H)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let J=new H7,Q=this.index.array,Z=this.attributes;for(let Y in Z){let q=Z[Y],G=$(q,Q);J.setAttribute(Y,G)}let W=this.morphAttributes;for(let Y in W){let q=[],G=W[Y];for(let V=0,H=G.length;V<H;V++){let N=G[V],O=$(N,Q);q.push(O)}J.morphAttributes[Y]=q}J.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;for(let Y=0,q=K.length;Y<q;Y++){let G=K[Y];J.addGroup(G.start,G.count,G.materialIndex)}return J}toJSON(){let $={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if($.uuid=this.uuid,$.type=this.type,this.name!=="")$.name=this.name;if(Object.keys(this.userData).length>0)$.userData=this.userData;if(this.parameters!==void 0){let q=this.parameters;for(let G in q)if(q[G]!==void 0)$[G]=q[G];return $}$.data={attributes:{}};let J=this.index;if(J!==null)$.data.index={type:J.array.constructor.name,array:Array.prototype.slice.call(J.array)};let Q=this.attributes;for(let q in Q){let G=Q[q];$.data.attributes[q]=G.toJSON($.data)}let Z={},W=!1;for(let q in this.morphAttributes){let G=this.morphAttributes[q],V=[];for(let H=0,N=G.length;H<N;H++){let O=G[H];V.push(O.toJSON($.data))}if(V.length>0)Z[q]=V,W=!0}if(W)$.data.morphAttributes=Z,$.data.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;if(K.length>0)$.data.groups=JSON.parse(JSON.stringify(K));let Y=this.boundingSphere;if(Y!==null)$.data.boundingSphere=Y.toJSON();return $}clone(){return new this.constructor().copy(this)}copy($){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let J={};this.name=$.name;let Q=$.index;if(Q!==null)this.setIndex(Q.clone());let Z=$.attributes;for(let G in Z){let V=Z[G];this.setAttribute(G,V.clone(J))}let W=$.morphAttributes;for(let G in W){let V=[],H=W[G];for(let N=0,O=H.length;N<O;N++)V.push(H[N].clone(J));this.morphAttributes[G]=V}this.morphTargetsRelative=$.morphTargetsRelative;let K=$.groups;for(let G=0,V=K.length;G<V;G++){let H=K[G];this.addGroup(H.start,H.count,H.materialIndex)}let Y=$.boundingBox;if(Y!==null)this.boundingBox=Y.clone();let q=$.boundingSphere;if(q!==null)this.boundingSphere=q.clone();return this.drawRange.start=$.drawRange.start,this.drawRange.count=$.drawRange.count,this.userData=$.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}};X4=new q6,Z$=new r$,JJ=new g7,G4=new d,QJ=new d,ZJ=new d,WJ=new d,U1=new d,KJ=new d,V4=new d,UJ=new d;O7=class O7 extends u6{constructor($=new H7,J=new jJ){super();this.isMesh=!0,this.type="Mesh",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy($,J){if(super.copy($,J),$.morphTargetInfluences!==void 0)this.morphTargetInfluences=$.morphTargetInfluences.slice();if($.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},$.morphTargetDictionary);return this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}getVertexPosition($,J){let Q=this.geometry,Z=Q.attributes.position,W=Q.morphAttributes.position,K=Q.morphTargetsRelative;J.fromBufferAttribute(Z,$);let Y=this.morphTargetInfluences;if(W&&Y){KJ.set(0,0,0);for(let q=0,G=W.length;q<G;q++){let V=Y[q],H=W[q];if(V===0)continue;if(U1.fromBufferAttribute(H,$),K)KJ.addScaledVector(U1,V);else KJ.addScaledVector(U1.sub(J),V)}J.add(KJ)}return J}raycast($,J){let Q=this.geometry,Z=this.material,W=this.matrixWorld;if(Z===void 0)return;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(JJ.copy(Q.boundingSphere),JJ.applyMatrix4(W),Z$.copy($.ray).recast($.near),JJ.containsPoint(Z$.origin)===!1){if(Z$.intersectSphere(JJ,G4)===null)return;if(Z$.origin.distanceToSquared(G4)>($.far-$.near)**2)return}if(X4.copy(W).invert(),Z$.copy($.ray).applyMatrix4(X4),Q.boundingBox!==null){if(Z$.intersectsBox(Q.boundingBox)===!1)return}this._computeIntersections($,J,Z$)}_computeIntersections($,J,Q){let Z,W=this.geometry,K=this.material,Y=W.index,q=W.attributes.position,G=W.attributes.uv,V=W.attributes.uv1,H=W.attributes.normal,N=W.groups,O=W.drawRange;if(Y!==null)if(Array.isArray(K))for(let P=0,D=N.length;P<D;P++){let C=N[P],z=K[C.materialIndex],L=Math.max(C.start,O.start),T=Math.min(Y.count,Math.min(C.start+C.count,O.start+O.count));for(let R=L,v=T;R<v;R+=3){let g=Y.getX(R),y=Y.getX(R+1),M=Y.getX(R+2);if(Z=YJ(this,z,$,Q,G,V,H,g,y,M),Z)Z.faceIndex=Math.floor(R/3),Z.face.materialIndex=C.materialIndex,J.push(Z)}}else{let P=Math.max(0,O.start),D=Math.min(Y.count,O.start+O.count);for(let C=P,z=D;C<z;C+=3){let L=Y.getX(C),T=Y.getX(C+1),R=Y.getX(C+2);if(Z=YJ(this,K,$,Q,G,V,H,L,T,R),Z)Z.faceIndex=Math.floor(C/3),J.push(Z)}}else if(q!==void 0)if(Array.isArray(K))for(let P=0,D=N.length;P<D;P++){let C=N[P],z=K[C.materialIndex],L=Math.max(C.start,O.start),T=Math.min(q.count,Math.min(C.start+C.count,O.start+O.count));for(let R=L,v=T;R<v;R+=3){let g=R,y=R+1,M=R+2;if(Z=YJ(this,z,$,Q,G,V,H,g,y,M),Z)Z.faceIndex=Math.floor(R/3),Z.face.materialIndex=C.materialIndex,J.push(Z)}}else{let P=Math.max(0,O.start),D=Math.min(q.count,O.start+O.count);for(let C=P,z=D;C<z;C+=3){let L=C,T=C+1,R=C+2;if(Z=YJ(this,K,$,Q,G,V,H,L,T,R),Z)Z.faceIndex=Math.floor(C/3),J.push(Z)}}}};t$=class t$ extends H7{constructor($=1,J=1,Q=1,Z=1,W=1,K=1){super();this.type="BoxGeometry",this.parameters={width:$,height:J,depth:Q,widthSegments:Z,heightSegments:W,depthSegments:K};let Y=this;Z=Math.floor(Z),W=Math.floor(W),K=Math.floor(K);let q=[],G=[],V=[],H=[],N=0,O=0;P("z","y","x",-1,-1,Q,J,$,K,W,0),P("z","y","x",1,-1,Q,J,-$,K,W,1),P("x","z","y",1,1,$,Q,J,Z,K,2),P("x","z","y",1,-1,$,Q,-J,Z,K,3),P("x","y","z",1,-1,$,J,Q,Z,W,4),P("x","y","z",-1,-1,$,J,-Q,Z,W,5),this.setIndex(q),this.setAttribute("position",new x6(G,3)),this.setAttribute("normal",new x6(V,3)),this.setAttribute("uv",new x6(H,2));function P(D,C,z,L,T,R,v,g,y,M,p){let A=R/y,j=v/M,h=R/2,l=v/2,m=g/2,n=y+1,o=M+1,$0=0,F0=0,J0=new d;for(let I0=0;I0<o;I0++){let y0=I0*j-l;for(let u0=0;u0<n;u0++){let t0=u0*A-h;J0[D]=t0*L,J0[C]=y0*T,J0[z]=m,G.push(J0.x,J0.y,J0.z),J0[D]=0,J0[C]=0,J0[z]=g>0?1:-1,V.push(J0.x,J0.y,J0.z),H.push(u0/y),H.push(1-I0/M),$0+=1}}for(let I0=0;I0<M;I0++)for(let y0=0;y0<y;y0++){let u0=N+y0+n*I0,t0=N+y0+n*(I0+1),O6=N+(y0+1)+n*(I0+1),B6=N+(y0+1)+n*I0;q.push(u0,t0,B6),q.push(t0,O6,B6),F0+=6}Y.addGroup(O,F0,p),O+=F0,N+=$0}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new t$($.width,$.height,$.depth,$.widthSegments,$.heightSegments,$.depthSegments)}};hX={clone:s$,merge:V7};n7=class n7 extends V8{constructor($){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=xX,this.fragmentShader=bX,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,$!==void 0)this.setValues($)}copy($){return super.copy($),this.fragmentShader=$.fragmentShader,this.vertexShader=$.vertexShader,this.uniforms=s$($.uniforms),this.uniformsGroups=yX($.uniformsGroups),this.defines=Object.assign({},$.defines),this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.fog=$.fog,this.lights=$.lights,this.clipping=$.clipping,this.extensions=Object.assign({},$.extensions),this.glslVersion=$.glslVersion,this}toJSON($){let J=super.toJSON($);J.glslVersion=this.glslVersion,J.uniforms={};for(let Z in this.uniforms){let K=this.uniforms[Z].value;if(K&&K.isTexture)J.uniforms[Z]={type:"t",value:K.toJSON($).uuid};else if(K&&K.isColor)J.uniforms[Z]={type:"c",value:K.getHex()};else if(K&&K.isVector2)J.uniforms[Z]={type:"v2",value:K.toArray()};else if(K&&K.isVector3)J.uniforms[Z]={type:"v3",value:K.toArray()};else if(K&&K.isVector4)J.uniforms[Z]={type:"v4",value:K.toArray()};else if(K&&K.isMatrix3)J.uniforms[Z]={type:"m3",value:K.toArray()};else if(K&&K.isMatrix4)J.uniforms[Z]={type:"m4",value:K.toArray()};else J.uniforms[Z]={value:K}}if(Object.keys(this.defines).length>0)J.defines=this.defines;J.vertexShader=this.vertexShader,J.fragmentShader=this.fragmentShader,J.lights=this.lights,J.clipping=this.clipping;let Q={};for(let Z in this.extensions)if(this.extensions[Z]===!0)Q[Z]=!0;if(Object.keys(Q).length>0)J.extensions=Q;return J}};M1=class M1 extends u6{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new q6,this.projectionMatrix=new q6,this.projectionMatrixInverse=new q6,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy($,J){return super.copy($,J),this.matrixWorldInverse.copy($.matrixWorldInverse),this.projectionMatrix.copy($.projectionMatrix),this.projectionMatrixInverse.copy($.projectionMatrixInverse),this.coordinateSystem=$.coordinateSystem,this}getWorldDirection($){return super.getWorldDirection($).negate()}updateMatrixWorld($){super.updateMatrixWorld($),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix($,J){super.updateWorldMatrix($,J),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}};T8=new d,B4=new V6,H4=new V6;B7=class B7 extends M1{constructor($=50,J=1,Q=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=$,this.zoom=1,this.near=Q,this.far=Z,this.focus=10,this.aspect=J,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy($,J){return super.copy($,J),this.fov=$.fov,this.zoom=$.zoom,this.near=$.near,this.far=$.far,this.focus=$.focus,this.aspect=$.aspect,this.view=$.view===null?null:Object.assign({},$.view),this.filmGauge=$.filmGauge,this.filmOffset=$.filmOffset,this}setFocalLength($){let J=0.5*this.getFilmHeight()/$;this.fov=i$*2*Math.atan(J),this.updateProjectionMatrix()}getFocalLength(){let $=Math.tan(m5*0.5*this.fov);return 0.5*this.getFilmHeight()/$}getEffectiveFOV(){return i$*2*Math.atan(Math.tan(m5*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds($,J,Q){T8.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),J.set(T8.x,T8.y).multiplyScalar(-$/T8.z),T8.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(T8.x,T8.y).multiplyScalar(-$/T8.z)}getViewSize($,J){return this.getViewBounds($,B4,H4),J.subVectors(H4,B4)}setViewOffset($,J,Q,Z,W,K){if(this.aspect=$/J,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=$,this.view.fullHeight=J,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let $=this.near,J=$*Math.tan(m5*0.5*this.fov)/this.zoom,Q=2*J,Z=this.aspect*Q,W=-0.5*Z,K=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:q,fullHeight:G}=K;W+=K.offsetX*Z/q,J-=K.offsetY*Q/G,Z*=K.width/q,Q*=K.height/G}let Y=this.filmOffset;if(Y!==0)W+=$*Y/this.getFilmWidth();this.projectionMatrix.makePerspective(W,W+Z,J,J-Q,$,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON($){let J=super.toJSON($);if(J.object.fov=this.fov,J.object.zoom=this.zoom,J.object.near=this.near,J.object.far=this.far,J.object.focus=this.focus,J.object.aspect=this.aspect,this.view!==null)J.object.view=Object.assign({},this.view);return J.object.filmGauge=this.filmGauge,J.object.filmOffset=this.filmOffset,J}};VK=class VK extends u6{constructor($,J,Q){super();this.type="CubeCamera",this.renderTarget=Q,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new B7(g$,p$,$,J);Z.layers=this.layers,this.add(Z);let W=new B7(g$,p$,$,J);W.layers=this.layers,this.add(W);let K=new B7(g$,p$,$,J);K.layers=this.layers,this.add(K);let Y=new B7(g$,p$,$,J);Y.layers=this.layers,this.add(Y);let q=new B7(g$,p$,$,J);q.layers=this.layers,this.add(q);let G=new B7(g$,p$,$,J);G.layers=this.layers,this.add(G)}updateCoordinateSystem(){let $=this.coordinateSystem,J=this.children.concat(),[Q,Z,W,K,Y,q]=J;for(let G of J)this.remove(G);if($===2000)Q.up.set(0,1,0),Q.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),W.up.set(0,0,-1),W.lookAt(0,1,0),K.up.set(0,0,1),K.lookAt(0,-1,0),Y.up.set(0,1,0),Y.lookAt(0,0,1),q.up.set(0,1,0),q.lookAt(0,0,-1);else if($===2001)Q.up.set(0,-1,0),Q.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),W.up.set(0,0,1),W.lookAt(0,1,0),K.up.set(0,0,-1),K.lookAt(0,-1,0),Y.up.set(0,-1,0),Y.lookAt(0,0,1),q.up.set(0,-1,0),q.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+$);for(let G of J)this.add(G),G.updateMatrixWorld()}update($,J){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:Q,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==$.coordinateSystem)this.coordinateSystem=$.coordinateSystem,this.updateCoordinateSystem();let[W,K,Y,q,G,V]=this.children,H=$.getRenderTarget(),N=$.getActiveCubeFace(),O=$.getActiveMipmapLevel(),P=$.xr.enabled;$.xr.enabled=!1;let D=Q.texture.generateMipmaps;Q.texture.generateMipmaps=!1,$.setRenderTarget(Q,0,Z),$.render(J,W),$.setRenderTarget(Q,1,Z),$.render(J,K),$.setRenderTarget(Q,2,Z),$.render(J,Y),$.setRenderTarget(Q,3,Z),$.render(J,q),$.setRenderTarget(Q,4,Z),$.render(J,G),Q.texture.generateMipmaps=D,$.setRenderTarget(Q,5,Z),$.render(J,V),$.setRenderTarget(H,N,O),$.xr.enabled=P,Q.texture.needsPMREMUpdate=!0}};T1=class T1 extends t6{constructor($=[],J=301,Q,Z,W,K,Y,q,G,V){super($,J,Q,Z,W,K,Y,q,G,V);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images($){this.image=$}};BK=class BK extends G8{constructor($=1,J={}){super($,$,J);this.isWebGLCubeRenderTarget=!0;let Q={width:$,height:$,depth:1},Z=[Q,Q,Q,Q,Q,Q];this.texture=new T1(Z),this._setTextureOptions(J),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture($,J){this.texture.type=J.type,this.texture.colorSpace=J.colorSpace,this.texture.generateMipmaps=J.generateMipmaps,this.texture.minFilter=J.minFilter,this.texture.magFilter=J.magFilter;let Q={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},Z=new t$(5,5,5),W=new n7({name:"CubemapFromEquirect",uniforms:s$(Q.uniforms),vertexShader:Q.vertexShader,fragmentShader:Q.fragmentShader,side:1,blending:0});W.uniforms.tEquirect.value=J;let K=new O7(Z,W),Y=J.minFilter;if(J.minFilter===1008)J.minFilter=1006;return new VK(1,10,this).update($,K),J.minFilter=Y,K.geometry.dispose(),K.material.dispose(),this}clear($,J=!0,Q=!0,Z=!0){let W=$.getRenderTarget();for(let K=0;K<6;K++)$.setRenderTarget(this,K),$.clear(J,Q,Z);$.setRenderTarget(W)}};d$=class d$ extends u6{constructor(){super();this.isGroup=!0,this.type="Group"}};fX={type:"move"};HK=class HK extends u6{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new c7,this.environmentIntensity=1,this.environmentRotation=new c7,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy($,J){if(super.copy($,J),$.background!==null)this.background=$.background.clone();if($.environment!==null)this.environment=$.environment.clone();if($.fog!==null)this.fog=$.fog.clone();if(this.backgroundBlurriness=$.backgroundBlurriness,this.backgroundIntensity=$.backgroundIntensity,this.backgroundRotation.copy($.backgroundRotation),this.environmentIntensity=$.environmentIntensity,this.environmentRotation.copy($.environmentRotation),$.overrideMaterial!==null)this.overrideMaterial=$.overrideMaterial.clone();return this.matrixAutoUpdate=$.matrixAutoUpdate,this}toJSON($){let J=super.toJSON($);if(this.fog!==null)J.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)J.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)J.object.backgroundIntensity=this.backgroundIntensity;if(J.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)J.object.environmentIntensity=this.environmentIntensity;return J.object.environmentRotation=this.environmentRotation.toArray(),J}};G7=new d;N4=new d,F4=new S6,O4=new S6,gX=new d,L4=new q6,qJ=new d,Y1=new g7,P4=new q6,q1=new r$;FK=class FK extends O7{constructor($,J){super($,J);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new q6,this.bindMatrixInverse=new q6,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let $=this.geometry;if(this.boundingBox===null)this.boundingBox=new i7;this.boundingBox.makeEmpty();let J=$.getAttribute("position");for(let Q=0;Q<J.count;Q++)this.getVertexPosition(Q,qJ),this.boundingBox.expandByPoint(qJ)}computeBoundingSphere(){let $=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new g7;this.boundingSphere.makeEmpty();let J=$.getAttribute("position");for(let Q=0;Q<J.count;Q++)this.getVertexPosition(Q,qJ),this.boundingSphere.expandByPoint(qJ)}copy($,J){if(super.copy($,J),this.bindMode=$.bindMode,this.bindMatrix.copy($.bindMatrix),this.bindMatrixInverse.copy($.bindMatrixInverse),this.skeleton=$.skeleton,$.boundingBox!==null)this.boundingBox=$.boundingBox.clone();if($.boundingSphere!==null)this.boundingSphere=$.boundingSphere.clone();return this}raycast($,J){let Q=this.material,Z=this.matrixWorld;if(Q===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(Y1.copy(this.boundingSphere),Y1.applyMatrix4(Z),$.ray.intersectsSphere(Y1)===!1)return;if(P4.copy(Z).invert(),q1.copy($.ray).applyMatrix4(P4),this.boundingBox!==null){if(q1.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections($,J,q1)}getVertexPosition($,J){return super.getVertexPosition($,J),this.applyBoneTransform($,J),J}bind($,J){if(this.skeleton=$,J===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),J=this.matrixWorld;this.bindMatrix.copy(J),this.bindMatrixInverse.copy(J).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let $=new S6,J=this.geometry.attributes.skinWeight;for(let Q=0,Z=J.count;Q<Z;Q++){$.fromBufferAttribute(J,Q);let W=1/$.manhattanLength();if(W!==1/0)$.multiplyScalar(W);else $.set(1,0,0,0);J.setXYZW(Q,$.x,$.y,$.z,$.w)}}updateMatrixWorld($){if(super.updateMatrixWorld($),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform($,J){let Q=this.skeleton,Z=this.geometry;F4.fromBufferAttribute(Z.attributes.skinIndex,$),O4.fromBufferAttribute(Z.attributes.skinWeight,$),N4.copy(J).applyMatrix4(this.bindMatrix),J.set(0,0,0);for(let W=0;W<4;W++){let K=O4.getComponent(W);if(K!==0){let Y=F4.getComponent(W);L4.multiplyMatrices(Q.bones[Y].matrixWorld,Q.boneInverses[Y]),J.addScaledVector(gX.copy(N4).applyMatrix4(L4),K)}}return J.applyMatrix4(this.bindMatrixInverse)}};_1=class _1 extends u6{constructor(){super();this.isBone=!0,this.type="Bone"}};s5=class s5 extends t6{constructor($=null,J=1,Q=1,Z,W,K,Y,q,G=1003,V=1003,H,N){super(null,K,Y,q,G,V,Z,W,H,N);this.isDataTexture=!0,this.image={data:$,width:J,height:Q},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};z4=new q6,pX=new q6;DJ=class DJ extends L7{constructor($,J,Q,Z=1){super($,J,Q);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=Z}copy($){return super.copy($),this.meshPerAttribute=$.meshPerAttribute,this}toJSON(){let $=super.toJSON();return $.meshPerAttribute=this.meshPerAttribute,$.isInstancedBufferAttribute=!0,$}};u$=new q6,I4=new q6,XJ=[],D4=new i7,uX=new q6,f5=new O7,g5=new g7;OK=class OK extends O7{constructor($,J,Q){super($,J);this.isInstancedMesh=!0,this.instanceMatrix=new DJ(new Float32Array(Q*16),16),this.instanceColor=null,this.morphTexture=null,this.count=Q,this.boundingBox=null,this.boundingSphere=null;for(let Z=0;Z<Q;Z++)this.setMatrixAt(Z,uX)}computeBoundingBox(){let $=this.geometry,J=this.count;if(this.boundingBox===null)this.boundingBox=new i7;if($.boundingBox===null)$.computeBoundingBox();this.boundingBox.makeEmpty();for(let Q=0;Q<J;Q++)this.getMatrixAt(Q,u$),D4.copy($.boundingBox).applyMatrix4(u$),this.boundingBox.union(D4)}computeBoundingSphere(){let $=this.geometry,J=this.count;if(this.boundingSphere===null)this.boundingSphere=new g7;if($.boundingSphere===null)$.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let Q=0;Q<J;Q++)this.getMatrixAt(Q,u$),g5.copy($.boundingSphere).applyMatrix4(u$),this.boundingSphere.union(g5)}copy($,J){if(super.copy($,J),this.instanceMatrix.copy($.instanceMatrix),$.morphTexture!==null)this.morphTexture=$.morphTexture.clone();if($.instanceColor!==null)this.instanceColor=$.instanceColor.clone();if(this.count=$.count,$.boundingBox!==null)this.boundingBox=$.boundingBox.clone();if($.boundingSphere!==null)this.boundingSphere=$.boundingSphere.clone();return this}getColorAt($,J){J.fromArray(this.instanceColor.array,$*3)}getMatrixAt($,J){J.fromArray(this.instanceMatrix.array,$*16)}getMorphAt($,J){let Q=J.morphTargetInfluences,Z=this.morphTexture.source.data.data,W=Q.length+1,K=$*W+1;for(let Y=0;Y<Q.length;Y++)Q[Y]=Z[K+Y]}raycast($,J){let Q=this.matrixWorld,Z=this.count;if(f5.geometry=this.geometry,f5.material=this.material,f5.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(g5.copy(this.boundingSphere),g5.applyMatrix4(Q),$.ray.intersectsSphere(g5)===!1)return;for(let W=0;W<Z;W++){this.getMatrixAt(W,u$),I4.multiplyMatrices(Q,u$),f5.matrixWorld=I4,f5.raycast($,XJ);for(let K=0,Y=XJ.length;K<Y;K++){let q=XJ[K];q.instanceId=W,q.object=this,J.push(q)}XJ.length=0}}setColorAt($,J){if(this.instanceColor===null)this.instanceColor=new DJ(new Float32Array(this.instanceMatrix.count*3).fill(1),3);J.toArray(this.instanceColor.array,$*3)}setMatrixAt($,J){J.toArray(this.instanceMatrix.array,$*16)}setMorphAt($,J){let Q=J.morphTargetInfluences,Z=Q.length+1;if(this.morphTexture===null)this.morphTexture=new s5(new Float32Array(Z*this.count),Z,this.count,1028,1015);let W=this.morphTexture.source.data.data,K=0;for(let G=0;G<Q.length;G++)K+=Q[G];let Y=this.geometry.morphTargetsRelative?1:1-K,q=Z*$;W[q]=Y,W.set(Q,q+1)}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}};X1=new d,lX=new d,mX=new K6;W$=new g7,dX=new V6(0.5,0.5),GJ=new d;MJ=class MJ extends V8{constructor($){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new U6(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.linewidth=$.linewidth,this.linecap=$.linecap,this.linejoin=$.linejoin,this.fog=$.fog,this}};CJ=new d,RJ=new d,C4=new q6,p5=new r$,VJ=new g7,G1=new d,R4=new d;TJ=class TJ extends u6{constructor($=new H7,J=new MJ){super();this.isLine=!0,this.type="Line",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy($,J){return super.copy($,J),this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}computeLineDistances(){let $=this.geometry;if($.index===null){let J=$.attributes.position,Q=[0];for(let Z=1,W=J.count;Z<W;Z++)CJ.fromBufferAttribute(J,Z-1),RJ.fromBufferAttribute(J,Z),Q[Z]=Q[Z-1],Q[Z]+=CJ.distanceTo(RJ);$.setAttribute("lineDistance",new x6(Q,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast($,J){let Q=this.geometry,Z=this.matrixWorld,W=$.params.Line.threshold,K=Q.drawRange;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(VJ.copy(Q.boundingSphere),VJ.applyMatrix4(Z),VJ.radius+=W,$.ray.intersectsSphere(VJ)===!1)return;C4.copy(Z).invert(),p5.copy($.ray).applyMatrix4(C4);let Y=W/((this.scale.x+this.scale.y+this.scale.z)/3),q=Y*Y,G=this.isLineSegments?2:1,V=Q.index,N=Q.attributes.position;if(V!==null){let O=Math.max(0,K.start),P=Math.min(V.count,K.start+K.count);for(let D=O,C=P-1;D<C;D+=G){let z=V.getX(D),L=V.getX(D+1),T=BJ(this,$,p5,q,z,L,D);if(T)J.push(T)}if(this.isLineLoop){let D=V.getX(P-1),C=V.getX(O),z=BJ(this,$,p5,q,D,C,P-1);if(z)J.push(z)}}else{let O=Math.max(0,K.start),P=Math.min(N.count,K.start+K.count);for(let D=O,C=P-1;D<C;D+=G){let z=BJ(this,$,p5,q,D,D+1,D);if(z)J.push(z)}if(this.isLineLoop){let D=BJ(this,$,p5,q,P-1,O,P-1);if(D)J.push(D)}}}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}};E4=new d,S4=new d;h1=class h1 extends TJ{constructor($,J){super($,J);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let $=this.geometry;if($.index===null){let J=$.attributes.position,Q=[];for(let Z=0,W=J.count;Z<W;Z+=2)E4.fromBufferAttribute(J,Z),S4.fromBufferAttribute(J,Z+1),Q[Z]=Z===0?0:Q[Z-1],Q[Z+1]=Q[Z]+E4.distanceTo(S4);$.setAttribute("lineDistance",new x6(Q,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};LK=class LK extends TJ{constructor($,J){super($,J);this.isLineLoop=!0,this.type="LineLoop"}};x1=class x1 extends V8{constructor($){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new U6(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.color.copy($.color),this.map=$.map,this.alphaMap=$.alphaMap,this.size=$.size,this.sizeAttenuation=$.sizeAttenuation,this.fog=$.fog,this}};A4=new q6,D1=new r$,HJ=new g7,NJ=new d;PK=class PK extends u6{constructor($=new H7,J=new x1){super();this.isPoints=!0,this.type="Points",this.geometry=$,this.material=J,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy($,J){return super.copy($,J),this.material=Array.isArray($.material)?$.material.slice():$.material,this.geometry=$.geometry,this}raycast($,J){let Q=this.geometry,Z=this.matrixWorld,W=$.params.Points.threshold,K=Q.drawRange;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(HJ.copy(Q.boundingSphere),HJ.applyMatrix4(Z),HJ.radius+=W,$.ray.intersectsSphere(HJ)===!1)return;A4.copy(Z).invert(),D1.copy($.ray).applyMatrix4(A4);let Y=W/((this.scale.x+this.scale.y+this.scale.z)/3),q=Y*Y,G=Q.index,H=Q.attributes.position;if(G!==null){let N=Math.max(0,K.start),O=Math.min(G.count,K.start+K.count);for(let P=N,D=O;P<D;P++){let C=G.getX(P);NJ.fromBufferAttribute(H,C),j4(NJ,C,q,Z,$,J,this)}}else{let N=Math.max(0,K.start),O=Math.min(H.count,K.start+K.count);for(let P=N,D=O;P<D;P++)NJ.fromBufferAttribute(H,P),j4(NJ,P,q,Z,$,J,this)}}updateMorphTargets(){let J=this.geometry.morphAttributes,Q=Object.keys(J);if(Q.length>0){let Z=J[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}};zK=class zK extends t6{constructor($,J,Q,Z,W,K,Y,q,G){super($,J,Q,Z,W,K,Y,q,G);this.isCanvasTexture=!0,this.needsUpdate=!0}};b1=class b1 extends t6{constructor($,J,Q=1014,Z,W,K,Y=1003,q=1003,G,V=1026,H=1){if(V!==1026&&V!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let N={width:$,height:J,depth:H};super(N,Z,W,K,Y,q,V,Q,G);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy($){return super.copy($),this.source=new SJ(Object.assign({},$.image)),this.compareFunction=$.compareFunction,this}toJSON($){let J=super.toJSON($);if(this.compareFunction!==null)J.compareFunction=this.compareFunction;return J}};f1=class f1 extends t6{constructor($=null){super();this.sourceTexture=$,this.isExternalTexture=!0}copy($){return super.copy($),this.sourceTexture=$.sourceTexture,this}};kJ=class kJ extends H7{constructor($=1,J=1,Q=1,Z=32,W=1,K=!1,Y=0,q=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:$,radiusBottom:J,height:Q,radialSegments:Z,heightSegments:W,openEnded:K,thetaStart:Y,thetaLength:q};let G=this;Z=Math.floor(Z),W=Math.floor(W);let V=[],H=[],N=[],O=[],P=0,D=[],C=Q/2,z=0;if(L(),K===!1){if($>0)T(!0);if(J>0)T(!1)}this.setIndex(V),this.setAttribute("position",new x6(H,3)),this.setAttribute("normal",new x6(N,3)),this.setAttribute("uv",new x6(O,2));function L(){let R=new d,v=new d,g=0,y=(J-$)/Q;for(let M=0;M<=W;M++){let p=[],A=M/W,j=A*(J-$)+$;for(let h=0;h<=Z;h++){let l=h/Z,m=l*q+Y,n=Math.sin(m),o=Math.cos(m);v.x=j*n,v.y=-A*Q+C,v.z=j*o,H.push(v.x,v.y,v.z),R.set(n,y,o).normalize(),N.push(R.x,R.y,R.z),O.push(l,1-A),p.push(P++)}D.push(p)}for(let M=0;M<Z;M++)for(let p=0;p<W;p++){let A=D[p][M],j=D[p+1][M],h=D[p+1][M+1],l=D[p][M+1];if($>0||p!==0)V.push(A,j,l),g+=3;if(J>0||p!==W-1)V.push(j,h,l),g+=3}G.addGroup(z,g,0),z+=g}function T(R){let v=P,g=new V6,y=new d,M=0,p=R===!0?$:J,A=R===!0?1:-1;for(let h=1;h<=Z;h++)H.push(0,C*A,0),N.push(0,A,0),O.push(0.5,0.5),P++;let j=P;for(let h=0;h<=Z;h++){let m=h/Z*q+Y,n=Math.cos(m),o=Math.sin(m);y.x=p*o,y.y=C*A,y.z=p*n,H.push(y.x,y.y,y.z),N.push(0,A,0),g.x=n*0.5+0.5,g.y=o*0.5*A+0.5,O.push(g.x,g.y),P++}for(let h=0;h<Z;h++){let l=v+h,m=j+h;if(R===!0)V.push(m,m+1,l);else V.push(m+1,m,l);M+=3}G.addGroup(z,M,R===!0?1:2),z+=M}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new kJ($.radiusTop,$.radiusBottom,$.height,$.radialSegments,$.heightSegments,$.openEnded,$.thetaStart,$.thetaLength)}};g1=class g1 extends kJ{constructor($=1,J=1,Q=32,Z=1,W=!1,K=0,Y=Math.PI*2){super(0,$,J,Q,Z,W,K,Y);this.type="ConeGeometry",this.parameters={radius:$,height:J,radialSegments:Q,heightSegments:Z,openEnded:W,thetaStart:K,thetaLength:Y}}static fromJSON($){return new g1($.radius,$.height,$.radialSegments,$.heightSegments,$.openEnded,$.thetaStart,$.thetaLength)}};vJ=class vJ extends H7{constructor($=[],J=[],Q=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:$,indices:J,radius:Q,detail:Z};let W=[],K=[];if(Y(Z),G(Q),V(),this.setAttribute("position",new x6(W,3)),this.setAttribute("normal",new x6(W.slice(),3)),this.setAttribute("uv",new x6(K,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function Y(L){let T=new d,R=new d,v=new d;for(let g=0;g<J.length;g+=3)O(J[g+0],T),O(J[g+1],R),O(J[g+2],v),q(T,R,v,L)}function q(L,T,R,v){let g=v+1,y=[];for(let M=0;M<=g;M++){y[M]=[];let p=L.clone().lerp(R,M/g),A=T.clone().lerp(R,M/g),j=g-M;for(let h=0;h<=j;h++)if(h===0&&M===g)y[M][h]=p;else y[M][h]=p.clone().lerp(A,h/j)}for(let M=0;M<g;M++)for(let p=0;p<2*(g-M)-1;p++){let A=Math.floor(p/2);if(p%2===0)N(y[M][A+1]),N(y[M+1][A]),N(y[M][A]);else N(y[M][A+1]),N(y[M+1][A+1]),N(y[M+1][A])}}function G(L){let T=new d;for(let R=0;R<W.length;R+=3)T.x=W[R+0],T.y=W[R+1],T.z=W[R+2],T.normalize().multiplyScalar(L),W[R+0]=T.x,W[R+1]=T.y,W[R+2]=T.z}function V(){let L=new d;for(let T=0;T<W.length;T+=3){L.x=W[T+0],L.y=W[T+1],L.z=W[T+2];let R=C(L)/2/Math.PI+0.5,v=z(L)/Math.PI+0.5;K.push(R,1-v)}P(),H()}function H(){for(let L=0;L<K.length;L+=6){let T=K[L+0],R=K[L+2],v=K[L+4],g=Math.max(T,R,v),y=Math.min(T,R,v);if(g>0.9&&y<0.1){if(T<0.2)K[L+0]+=1;if(R<0.2)K[L+2]+=1;if(v<0.2)K[L+4]+=1}}}function N(L){W.push(L.x,L.y,L.z)}function O(L,T){let R=L*3;T.x=$[R+0],T.y=$[R+1],T.z=$[R+2]}function P(){let L=new d,T=new d,R=new d,v=new d,g=new V6,y=new V6,M=new V6;for(let p=0,A=0;p<W.length;p+=9,A+=6){L.set(W[p+0],W[p+1],W[p+2]),T.set(W[p+3],W[p+4],W[p+5]),R.set(W[p+6],W[p+7],W[p+8]),g.set(K[A+0],K[A+1]),y.set(K[A+2],K[A+3]),M.set(K[A+4],K[A+5]),v.copy(L).add(T).add(R).divideScalar(3);let j=C(v);D(g,A+0,L,j),D(y,A+2,T,j),D(M,A+4,R,j)}}function D(L,T,R,v){if(v<0&&L.x===1)K[T]=L.x-1;if(R.x===0&&R.z===0)K[T]=v/2/Math.PI+0.5}function C(L){return Math.atan2(L.z,-L.x)}function z(L){return Math.atan2(-L.y,Math.sqrt(L.x*L.x+L.z*L.z))}}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new vJ($.vertices,$.indices,$.radius,$.details)}};p1=class p1 extends vJ{constructor($=1,J=0){let Q=(1+Math.sqrt(5))/2,Z=[-1,Q,0,1,Q,0,-1,-Q,0,1,-Q,0,0,-1,Q,0,1,Q,0,-1,-Q,0,1,-Q,Q,0,-1,Q,0,1,-Q,0,-1,-Q,0,1],W=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(Z,W,$,J);this.type="IcosahedronGeometry",this.parameters={radius:$,detail:J}}static fromJSON($){return new p1($.radius,$.detail)}};u1=class u1 extends vJ{constructor($=1,J=0){let Q=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],Z=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(Q,Z,$,J);this.type="OctahedronGeometry",this.parameters={radius:$,detail:J}}static fromJSON($){return new u1($.radius,$.detail)}};o5=class o5 extends H7{constructor($=1,J=1,Q=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:$,height:J,widthSegments:Q,heightSegments:Z};let W=$/2,K=J/2,Y=Math.floor(Q),q=Math.floor(Z),G=Y+1,V=q+1,H=$/Y,N=J/q,O=[],P=[],D=[],C=[];for(let z=0;z<V;z++){let L=z*N-K;for(let T=0;T<G;T++){let R=T*H-W;P.push(R,-L,0),D.push(0,0,1),C.push(T/Y),C.push(1-z/q)}}for(let z=0;z<q;z++)for(let L=0;L<Y;L++){let T=L+G*z,R=L+G*(z+1),v=L+1+G*(z+1),g=L+1+G*z;O.push(T,R,g),O.push(R,v,g)}this.setIndex(O),this.setAttribute("position",new x6(P,3)),this.setAttribute("normal",new x6(D,3)),this.setAttribute("uv",new x6(C,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new o5($.width,$.height,$.widthSegments,$.heightSegments)}};l1=class l1 extends H7{constructor($=1,J=32,Q=16,Z=0,W=Math.PI*2,K=0,Y=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:$,widthSegments:J,heightSegments:Q,phiStart:Z,phiLength:W,thetaStart:K,thetaLength:Y},J=Math.max(3,Math.floor(J)),Q=Math.max(2,Math.floor(Q));let q=Math.min(K+Y,Math.PI),G=0,V=[],H=new d,N=new d,O=[],P=[],D=[],C=[];for(let z=0;z<=Q;z++){let L=[],T=z/Q,R=0;if(z===0&&K===0)R=0.5/J;else if(z===Q&&q===Math.PI)R=-0.5/J;for(let v=0;v<=J;v++){let g=v/J;H.x=-$*Math.cos(Z+g*W)*Math.sin(K+T*Y),H.y=$*Math.cos(K+T*Y),H.z=$*Math.sin(Z+g*W)*Math.sin(K+T*Y),P.push(H.x,H.y,H.z),N.copy(H).normalize(),D.push(N.x,N.y,N.z),C.push(g+R,1-T),L.push(G++)}V.push(L)}for(let z=0;z<Q;z++)for(let L=0;L<J;L++){let T=V[z][L+1],R=V[z][L],v=V[z+1][L],g=V[z+1][L+1];if(z!==0||K>0)O.push(T,R,g);if(z!==Q-1||q<Math.PI)O.push(R,v,g)}this.setIndex(O),this.setAttribute("position",new x6(P,3)),this.setAttribute("normal",new x6(D,3)),this.setAttribute("uv",new x6(C,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new l1($.radius,$.widthSegments,$.heightSegments,$.phiStart,$.phiLength,$.thetaStart,$.thetaLength)}};m1=class m1 extends H7{constructor($=1,J=0.4,Q=12,Z=48,W=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:$,tube:J,radialSegments:Q,tubularSegments:Z,arc:W},Q=Math.floor(Q),Z=Math.floor(Z);let K=[],Y=[],q=[],G=[],V=new d,H=new d,N=new d;for(let O=0;O<=Q;O++)for(let P=0;P<=Z;P++){let D=P/Z*W,C=O/Q*Math.PI*2;H.x=($+J*Math.cos(C))*Math.cos(D),H.y=($+J*Math.cos(C))*Math.sin(D),H.z=J*Math.sin(C),Y.push(H.x,H.y,H.z),V.x=$*Math.cos(D),V.y=$*Math.sin(D),N.subVectors(H,V).normalize(),q.push(N.x,N.y,N.z),G.push(P/Z),G.push(O/Q)}for(let O=1;O<=Q;O++)for(let P=1;P<=Z;P++){let D=(Z+1)*O+P-1,C=(Z+1)*(O-1)+P-1,z=(Z+1)*(O-1)+P,L=(Z+1)*O+P;K.push(D,C,L),K.push(C,z,L)}this.setIndex(K),this.setAttribute("position",new x6(Y,3)),this.setAttribute("normal",new x6(q,3)),this.setAttribute("uv",new x6(G,2))}copy($){return super.copy($),this.parameters=Object.assign({},$.parameters),this}static fromJSON($){return new m1($.radius,$.tube,$.radialSegments,$.tubularSegments,$.arc)}};d1=class d1 extends V8{constructor($){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new U6(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new U6(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new V6(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c7,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues($)}copy($){return super.copy($),this.defines={STANDARD:""},this.color.copy($.color),this.roughness=$.roughness,this.metalness=$.metalness,this.map=$.map,this.lightMap=$.lightMap,this.lightMapIntensity=$.lightMapIntensity,this.aoMap=$.aoMap,this.aoMapIntensity=$.aoMapIntensity,this.emissive.copy($.emissive),this.emissiveMap=$.emissiveMap,this.emissiveIntensity=$.emissiveIntensity,this.bumpMap=$.bumpMap,this.bumpScale=$.bumpScale,this.normalMap=$.normalMap,this.normalMapType=$.normalMapType,this.normalScale.copy($.normalScale),this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.roughnessMap=$.roughnessMap,this.metalnessMap=$.metalnessMap,this.alphaMap=$.alphaMap,this.envMap=$.envMap,this.envMapRotation.copy($.envMapRotation),this.envMapIntensity=$.envMapIntensity,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this.wireframeLinecap=$.wireframeLinecap,this.wireframeLinejoin=$.wireframeLinejoin,this.flatShading=$.flatShading,this.fog=$.fog,this}};IK=class IK extends d1{constructor($){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new V6(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return G6(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(J){this.ior=(1+0.4*J)/(1-0.4*J)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new U6(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new U6(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new U6(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues($)}get anisotropy(){return this._anisotropy}set anisotropy($){if(this._anisotropy>0!==$>0)this.version++;this._anisotropy=$}get clearcoat(){return this._clearcoat}set clearcoat($){if(this._clearcoat>0!==$>0)this.version++;this._clearcoat=$}get iridescence(){return this._iridescence}set iridescence($){if(this._iridescence>0!==$>0)this.version++;this._iridescence=$}get dispersion(){return this._dispersion}set dispersion($){if(this._dispersion>0!==$>0)this.version++;this._dispersion=$}get sheen(){return this._sheen}set sheen($){if(this._sheen>0!==$>0)this.version++;this._sheen=$}get transmission(){return this._transmission}set transmission($){if(this._transmission>0!==$>0)this.version++;this._transmission=$}copy($){return super.copy($),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=$.anisotropy,this.anisotropyRotation=$.anisotropyRotation,this.anisotropyMap=$.anisotropyMap,this.clearcoat=$.clearcoat,this.clearcoatMap=$.clearcoatMap,this.clearcoatRoughness=$.clearcoatRoughness,this.clearcoatRoughnessMap=$.clearcoatRoughnessMap,this.clearcoatNormalMap=$.clearcoatNormalMap,this.clearcoatNormalScale.copy($.clearcoatNormalScale),this.dispersion=$.dispersion,this.ior=$.ior,this.iridescence=$.iridescence,this.iridescenceMap=$.iridescenceMap,this.iridescenceIOR=$.iridescenceIOR,this.iridescenceThicknessRange=[...$.iridescenceThicknessRange],this.iridescenceThicknessMap=$.iridescenceThicknessMap,this.sheen=$.sheen,this.sheenColor.copy($.sheenColor),this.sheenColorMap=$.sheenColorMap,this.sheenRoughness=$.sheenRoughness,this.sheenRoughnessMap=$.sheenRoughnessMap,this.transmission=$.transmission,this.transmissionMap=$.transmissionMap,this.thickness=$.thickness,this.thicknessMap=$.thicknessMap,this.attenuationDistance=$.attenuationDistance,this.attenuationColor.copy($.attenuationColor),this.specularIntensity=$.specularIntensity,this.specularIntensityMap=$.specularIntensityMap,this.specularColor.copy($.specularColor),this.specularColorMap=$.specularColorMap,this}};DK=class DK extends V8{constructor($){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues($)}copy($){return super.copy($),this.depthPacking=$.depthPacking,this.map=$.map,this.alphaMap=$.alphaMap,this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this.wireframe=$.wireframe,this.wireframeLinewidth=$.wireframeLinewidth,this}};CK=class CK extends V8{constructor($){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues($)}copy($){return super.copy($),this.map=$.map,this.alphaMap=$.alphaMap,this.displacementMap=$.displacementMap,this.displacementScale=$.displacementScale,this.displacementBias=$.displacementBias,this}};EK=class EK extends e${constructor($,J,Q,Z){super($,J,Q,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_($,J,Q){let Z=this.parameterPositions,W=$-2,K=$+1,Y=Z[W],q=Z[K];if(Y===void 0)switch(this.getSettings_().endingStart){case 2401:W=$,Y=2*J-Q;break;case 2402:W=Z.length-2,Y=J+Z[W]-Z[W+1];break;default:W=$,Y=Q}if(q===void 0)switch(this.getSettings_().endingEnd){case 2401:K=$,q=2*Q-J;break;case 2402:K=1,q=Q+Z[1]-Z[0];break;default:K=$-1,q=J}let G=(Q-J)*0.5,V=this.valueSize;this._weightPrev=G/(J-Y),this._weightNext=G/(q-Q),this._offsetPrev=W*V,this._offsetNext=K*V}interpolate_($,J,Q,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,q=$*Y,G=q-Y,V=this._offsetPrev,H=this._offsetNext,N=this._weightPrev,O=this._weightNext,P=(Q-J)/(Z-J),D=P*P,C=D*P,z=-N*C+2*N*D-N*P,L=(1+N)*C+(-1.5-2*N)*D+(-0.5+N)*P+1,T=(-1-O)*C+(1.5+O)*D+0.5*P,R=O*C-O*D;for(let v=0;v!==Y;++v)W[v]=z*K[V+v]+L*K[G+v]+T*K[q+v]+R*K[H+v];return W}};c1=class c1 extends e${constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($,J,Q,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,q=$*Y,G=q-Y,V=(Q-J)/(Z-J),H=1-V;for(let N=0;N!==Y;++N)W[N]=K[G+N]*H+K[q+N]*V;return W}};SK=class SK extends e${constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($){return this.copySampleValue_($-1)}};A7.prototype.ValueTypeName="";A7.prototype.TimeBufferType=Float32Array;A7.prototype.ValueBufferType=Float32Array;A7.prototype.DefaultInterpolation=2301;X$=class X$ extends A7{constructor($,J,Q){super($,J,Q)}};X$.prototype.ValueTypeName="bool";X$.prototype.ValueBufferType=Array;X$.prototype.DefaultInterpolation=2300;X$.prototype.InterpolantFactoryMethodLinear=void 0;X$.prototype.InterpolantFactoryMethodSmooth=void 0;n1=class n1 extends A7{constructor($,J,Q,Z){super($,J,Q,Z)}};n1.prototype.ValueTypeName="color";o$=class o$ extends A7{constructor($,J,Q,Z){super($,J,Q,Z)}};o$.prototype.ValueTypeName="number";AK=class AK extends e${constructor($,J,Q,Z){super($,J,Q,Z)}interpolate_($,J,Q,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,q=(Q-J)/(Z-J),G=$*Y;for(let V=G+Y;G!==V;G+=4)f7.slerpFlat(W,0,K,G-Y,K,G,q);return W}};$5=class $5 extends A7{constructor($,J,Q,Z){super($,J,Q,Z)}InterpolantFactoryMethodLinear($){return new AK(this.times,this.values,this.getValueSize(),$)}};$5.prototype.ValueTypeName="quaternion";$5.prototype.InterpolantFactoryMethodSmooth=void 0;G$=class G$ extends A7{constructor($,J,Q){super($,J,Q)}};G$.prototype.ValueTypeName="string";G$.prototype.ValueBufferType=Array;G$.prototype.DefaultInterpolation=2300;G$.prototype.InterpolantFactoryMethodLinear=void 0;G$.prototype.InterpolantFactoryMethodSmooth=void 0;a$=class a$ extends A7{constructor($,J,Q,Z){super($,J,Q,Z)}};a$.prototype.ValueTypeName="vector";q8={enabled:!1,files:{},add:function($,J){if(this.enabled===!1)return;this.files[$]=J},get:function($){if(this.enabled===!1)return;return this.files[$]},remove:function($){delete this.files[$]},clear:function(){this.files={}}};oX=new jK;y8.DEFAULT_MATERIAL_NAME="__DEFAULT";U8={};wK=class wK extends Error{constructor($,J){super($);this.response=J}};i1=class i1 extends y8{constructor($){super($);this.mimeType="",this.responseType="",this._abortController=new AbortController}load($,J,Q,Z){if($===void 0)$="";if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let W=q8.get(`file:${$}`);if(W!==void 0)return this.manager.itemStart($),setTimeout(()=>{if(J)J(W);this.manager.itemEnd($)},0),W;if(U8[$]!==void 0){U8[$].push({onLoad:J,onProgress:Q,onError:Z});return}U8[$]=[],U8[$].push({onLoad:J,onProgress:Q,onError:Z});let K=new Request($,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),Y=this.mimeType,q=this.responseType;fetch(K).then((G)=>{if(G.status===200||G.status===0){if(G.status===0)console.warn("THREE.FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||G.body===void 0||G.body.getReader===void 0)return G;let V=U8[$],H=G.body.getReader(),N=G.headers.get("X-File-Size")||G.headers.get("Content-Length"),O=N?parseInt(N):0,P=O!==0,D=0,C=new ReadableStream({start(z){L();function L(){H.read().then(({done:T,value:R})=>{if(T)z.close();else{D+=R.byteLength;let v=new ProgressEvent("progress",{lengthComputable:P,loaded:D,total:O});for(let g=0,y=V.length;g<y;g++){let M=V[g];if(M.onProgress)M.onProgress(v)}z.enqueue(R),L()}},(T)=>{z.error(T)})}}});return new Response(C)}else throw new wK(`fetch for "${G.url}" responded with ${G.status}: ${G.statusText}`,G)}).then((G)=>{switch(q){case"arraybuffer":return G.arrayBuffer();case"blob":return G.blob();case"document":return G.text().then((V)=>{return new DOMParser().parseFromString(V,Y)});case"json":return G.json();default:if(Y==="")return G.text();else{let H=/charset="?([^;"\s]*)"?/i.exec(Y),N=H&&H[1]?H[1].toLowerCase():void 0,O=new TextDecoder(N);return G.arrayBuffer().then((P)=>O.decode(P))}}}).then((G)=>{q8.add(`file:${$}`,G);let V=U8[$];delete U8[$];for(let H=0,N=V.length;H<N;H++){let O=V[H];if(O.onLoad)O.onLoad(G)}}).catch((G)=>{let V=U8[$];if(V===void 0)throw this.manager.itemError($),G;delete U8[$];for(let H=0,N=V.length;H<N;H++){let O=V[H];if(O.onError)O.onError(G)}this.manager.itemError($)}).finally(()=>{this.manager.itemEnd($)}),this.manager.itemStart($)}setResponseType($){return this.responseType=$,this}setMimeType($){return this.mimeType=$,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};l$=new WeakMap;MK=class MK extends y8{constructor($){super($)}load($,J,Q,Z){if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let W=this,K=q8.get(`image:${$}`);if(K!==void 0){if(K.complete===!0)W.manager.itemStart($),setTimeout(function(){if(J)J(K);W.manager.itemEnd($)},0);else{let H=l$.get(K);if(H===void 0)H=[],l$.set(K,H);H.push({onLoad:J,onError:Z})}return K}let Y=n5("img");function q(){if(V(),J)J(this);let H=l$.get(this)||[];for(let N=0;N<H.length;N++){let O=H[N];if(O.onLoad)O.onLoad(this)}l$.delete(this),W.manager.itemEnd($)}function G(H){if(V(),Z)Z(H);q8.remove(`image:${$}`);let N=l$.get(this)||[];for(let O=0;O<N.length;O++){let P=N[O];if(P.onError)P.onError(H)}l$.delete(this),W.manager.itemError($),W.manager.itemEnd($)}function V(){Y.removeEventListener("load",q,!1),Y.removeEventListener("error",G,!1)}if(Y.addEventListener("load",q,!1),Y.addEventListener("error",G,!1),$.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)Y.crossOrigin=this.crossOrigin}return q8.add(`image:${$}`,Y),W.manager.itemStart($),Y.src=$,Y}};TK=class TK extends y8{constructor($){super($)}load($,J,Q,Z){let W=this,K=new s5,Y=new i1(this.manager);return Y.setResponseType("arraybuffer"),Y.setRequestHeader(this.requestHeader),Y.setPath(this.path),Y.setWithCredentials(W.withCredentials),Y.load($,function(q){let G;try{G=W.parse(q)}catch(V){if(Z!==void 0)Z(V);else{console.error(V);return}}if(G.image!==void 0)K.image=G.image;else if(G.data!==void 0)K.image.width=G.width,K.image.height=G.height,K.image.data=G.data;if(K.wrapS=G.wrapS!==void 0?G.wrapS:1001,K.wrapT=G.wrapT!==void 0?G.wrapT:1001,K.magFilter=G.magFilter!==void 0?G.magFilter:1006,K.minFilter=G.minFilter!==void 0?G.minFilter:1006,K.anisotropy=G.anisotropy!==void 0?G.anisotropy:1,G.colorSpace!==void 0)K.colorSpace=G.colorSpace;if(G.flipY!==void 0)K.flipY=G.flipY;if(G.format!==void 0)K.format=G.format;if(G.type!==void 0)K.type=G.type;if(G.mipmaps!==void 0)K.mipmaps=G.mipmaps,K.minFilter=1008;if(G.mipmapCount===1)K.minFilter=1006;if(G.generateMipmaps!==void 0)K.generateMipmaps=G.generateMipmaps;if(K.needsUpdate=!0,J)J(K,G)},Q,Z),K}};kK=class kK extends y8{constructor($){super($)}load($,J,Q,Z){let W=new t6,K=new MK(this.manager);return K.setCrossOrigin(this.crossOrigin),K.setPath(this.path),K.load($,function(Y){if(W.image=Y,W.needsUpdate=!0,J!==void 0)J(W)},Q,Z),W}};a5=class a5 extends u6{constructor($,J=1){super();this.isLight=!0,this.type="Light",this.color=new U6($),this.intensity=J}dispose(){}copy($,J){return super.copy($,J),this.color.copy($.color),this.intensity=$.intensity,this}toJSON($){let J=super.toJSON($);if(J.object.color=this.color.getHex(),J.object.intensity=this.intensity,this.groundColor!==void 0)J.object.groundColor=this.groundColor.getHex();if(this.distance!==void 0)J.object.distance=this.distance;if(this.angle!==void 0)J.object.angle=this.angle;if(this.decay!==void 0)J.object.decay=this.decay;if(this.penumbra!==void 0)J.object.penumbra=this.penumbra;if(this.shadow!==void 0)J.object.shadow=this.shadow.toJSON();if(this.target!==void 0)J.object.target=this.target.uuid;return J}};V1=new q6,M4=new d,T4=new d;vK=class vK extends _J{constructor(){super(new B7(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices($){let J=this.camera,Q=i$*2*$.angle*this.focus,Z=this.mapSize.width/this.mapSize.height*this.aspect,W=$.distance||J.far;if(Q!==J.fov||Z!==J.aspect||W!==J.far)J.fov=Q,J.aspect=Z,J.far=W,J.updateProjectionMatrix();super.updateMatrices($)}copy($){return super.copy($),this.focus=$.focus,this}};_K=class _K extends a5{constructor($,J,Q=0,Z=Math.PI/3,W=0,K=2){super($,J);this.isSpotLight=!0,this.type="SpotLight",this.position.copy(u6.DEFAULT_UP),this.updateMatrix(),this.target=new u6,this.distance=Q,this.angle=Z,this.penumbra=W,this.decay=K,this.map=null,this.shadow=new vK}get power(){return this.intensity*Math.PI}set power($){this.intensity=$/Math.PI}dispose(){this.shadow.dispose()}copy($,J){return super.copy($,J),this.distance=$.distance,this.angle=$.angle,this.penumbra=$.penumbra,this.decay=$.decay,this.target=$.target.clone(),this.shadow=$.shadow.clone(),this}};k4=new q6,u5=new d,B1=new d;yK=class yK extends _J{constructor(){super(new B7(90,1,0.5,500));this.isPointLightShadow=!0,this._frameExtents=new V6(4,2),this._viewportCount=6,this._viewports=[new S6(2,1,1,1),new S6(0,1,1,1),new S6(3,1,1,1),new S6(1,1,1,1),new S6(3,0,1,1),new S6(1,0,1,1)],this._cubeDirections=[new d(1,0,0),new d(-1,0,0),new d(0,0,1),new d(0,0,-1),new d(0,1,0),new d(0,-1,0)],this._cubeUps=[new d(0,1,0),new d(0,1,0),new d(0,1,0),new d(0,1,0),new d(0,0,1),new d(0,0,-1)]}updateMatrices($,J=0){let Q=this.camera,Z=this.matrix,W=$.distance||Q.far;if(W!==Q.far)Q.far=W,Q.updateProjectionMatrix();u5.setFromMatrixPosition($.matrixWorld),Q.position.copy(u5),B1.copy(Q.position),B1.add(this._cubeDirections[J]),Q.up.copy(this._cubeUps[J]),Q.lookAt(B1),Q.updateMatrixWorld(),Z.makeTranslation(-u5.x,-u5.y,-u5.z),k4.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),this._frustum.setFromProjectionMatrix(k4,Q.coordinateSystem,Q.reversedDepth)}};hK=class hK extends a5{constructor($,J,Q=0,Z=2){super($,J);this.isPointLight=!0,this.type="PointLight",this.distance=Q,this.decay=Z,this.shadow=new yK}get power(){return this.intensity*4*Math.PI}set power($){this.intensity=$/(4*Math.PI)}dispose(){this.shadow.dispose()}copy($,J){return super.copy($,J),this.distance=$.distance,this.decay=$.decay,this.shadow=$.shadow.clone(),this}};yJ=class yJ extends M1{constructor($=-1,J=1,Q=1,Z=-1,W=0.1,K=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=$,this.right=J,this.top=Q,this.bottom=Z,this.near=W,this.far=K,this.updateProjectionMatrix()}copy($,J){return super.copy($,J),this.left=$.left,this.right=$.right,this.top=$.top,this.bottom=$.bottom,this.near=$.near,this.far=$.far,this.zoom=$.zoom,this.view=$.view===null?null:Object.assign({},$.view),this}setViewOffset($,J,Q,Z,W,K){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=$,this.view.fullHeight=J,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let $=(this.right-this.left)/(2*this.zoom),J=(this.top-this.bottom)/(2*this.zoom),Q=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,W=Q-$,K=Q+$,Y=Z+J,q=Z-J;if(this.view!==null&&this.view.enabled){let G=(this.right-this.left)/this.view.fullWidth/this.zoom,V=(this.top-this.bottom)/this.view.fullHeight/this.zoom;W+=G*this.view.offsetX,K=W+G*this.view.width,Y-=V*this.view.offsetY,q=Y-V*this.view.height}this.projectionMatrix.makeOrthographic(W,K,Y,q,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON($){let J=super.toJSON($);if(J.object.zoom=this.zoom,J.object.left=this.left,J.object.right=this.right,J.object.top=this.top,J.object.bottom=this.bottom,J.object.near=this.near,J.object.far=this.far,this.view!==null)J.object.view=Object.assign({},this.view);return J}};xK=class xK extends _J{constructor(){super(new yJ(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}};bK=class bK extends a5{constructor($,J){super($,J);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(u6.DEFAULT_UP),this.updateMatrix(),this.target=new u6,this.shadow=new xK}dispose(){this.shadow.dispose()}copy($){return super.copy($),this.target=$.target.clone(),this.shadow=$.shadow.clone(),this}};fK=class fK extends a5{constructor($,J){super($,J);this.isAmbientLight=!0,this.type="AmbientLight"}};H1=new WeakMap;pK=class pK extends y8{constructor($){super($);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")console.warn("THREE.ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions($){return this.options=$,this}load($,J,Q,Z){if($===void 0)$="";if(this.path!==void 0)$=this.path+$;$=this.manager.resolveURL($);let W=this,K=q8.get(`image-bitmap:${$}`);if(K!==void 0){if(W.manager.itemStart($),K.then){K.then((G)=>{if(H1.has(K)===!0){if(Z)Z(H1.get(K));W.manager.itemError($),W.manager.itemEnd($)}else{if(J)J(G);return W.manager.itemEnd($),G}});return}return setTimeout(function(){if(J)J(K);W.manager.itemEnd($)},0),K}let Y={};Y.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",Y.headers=this.requestHeader,Y.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let q=fetch($,Y).then(function(G){return G.blob()}).then(function(G){return createImageBitmap(G,Object.assign(W.options,{colorSpaceConversion:"none"}))}).then(function(G){if(q8.add(`image-bitmap:${$}`,G),J)J(G);return W.manager.itemEnd($),G}).catch(function(G){if(Z)Z(G);H1.set(q,G),q8.remove(`image-bitmap:${$}`),W.manager.itemError($),W.manager.itemEnd($)});q8.add(`image-bitmap:${$}`,q),W.manager.itemStart($)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};uK=class uK extends B7{constructor($=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=$}};aX=new RegExp("["+s1+"]","g"),o1="[^"+s1+"]",rX="[^"+s1.replace("\\.","")+"]",tX=/((?:WC+[\/:])*)/.source.replace("WC",o1),eX=/(WCOD+)?/.source.replace("WCOD",rX),$G=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",o1),JG=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",o1),QG=new RegExp("^"+tX+eX+$G+JG+"$"),ZG=["material","materials","bones","map"];j6.Composite=mK;j6.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};j6.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};j6.prototype.GetterByBindingType=[j6.prototype._getValue_direct,j6.prototype._getValue_array,j6.prototype._getValue_arrayElement,j6.prototype._getValue_toArray];j6.prototype.SetterByBindingTypeAndVersioning=[[j6.prototype._setValue_direct,j6.prototype._setValue_direct_setNeedsUpdate,j6.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[j6.prototype._setValue_array,j6.prototype._setValue_array_setNeedsUpdate,j6.prototype._setValue_array_setMatrixWorldNeedsUpdate],[j6.prototype._setValue_arrayElement,j6.prototype._setValue_arrayElement_setNeedsUpdate,j6.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[j6.prototype._setValue_fromArray,j6.prototype._setValue_fromArray_setNeedsUpdate,j6.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];WG=new Float32Array(1);cK=class cK extends _8{constructor($){super();this._root=$,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction($,J){let Q=$._localRoot||this._root,Z=$._clip.tracks,W=Z.length,K=$._propertyBindings,Y=$._interpolants,q=Q.uuid,G=this._bindingsByRootAndName,V=G[q];if(V===void 0)V={},G[q]=V;for(let H=0;H!==W;++H){let N=Z[H],O=N.name,P=V[O];if(P!==void 0)++P.referenceCount,K[H]=P;else{if(P=K[H],P!==void 0){if(P._cacheIndex===null)++P.referenceCount,this._addInactiveBinding(P,q,O);continue}let D=J&&J._propertyBindings[H].binding.parsedPath;P=new lK(j6.create(Q,O,D),N.ValueTypeName,N.getValueSize()),++P.referenceCount,this._addInactiveBinding(P,q,O),K[H]=P}Y[H].resultBuffer=P.buffer}}_activateAction($){if(!this._isActiveAction($)){if($._cacheIndex===null){let Q=($._localRoot||this._root).uuid,Z=$._clip.uuid,W=this._actionsByClip[Z];this._bindAction($,W&&W.knownActions[0]),this._addInactiveAction($,Z,Q)}let J=$._propertyBindings;for(let Q=0,Z=J.length;Q!==Z;++Q){let W=J[Q];if(W.useCount++===0)this._lendBinding(W),W.saveOriginalState()}this._lendAction($)}}_deactivateAction($){if(this._isActiveAction($)){let J=$._propertyBindings;for(let Q=0,Z=J.length;Q!==Z;++Q){let W=J[Q];if(--W.useCount===0)W.restoreOriginalState(),this._takeBackBinding(W)}this._takeBackAction($)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let $=this;this.stats={actions:{get total(){return $._actions.length},get inUse(){return $._nActiveActions}},bindings:{get total(){return $._bindings.length},get inUse(){return $._nActiveBindings}},controlInterpolants:{get total(){return $._controlInterpolants.length},get inUse(){return $._nActiveControlInterpolants}}}}_isActiveAction($){let J=$._cacheIndex;return J!==null&&J<this._nActiveActions}_addInactiveAction($,J,Q){let Z=this._actions,W=this._actionsByClip,K=W[J];if(K===void 0)K={knownActions:[$],actionByRoot:{}},$._byClipCacheIndex=0,W[J]=K;else{let Y=K.knownActions;$._byClipCacheIndex=Y.length,Y.push($)}$._cacheIndex=Z.length,Z.push($),K.actionByRoot[Q]=$}_removeInactiveAction($){let J=this._actions,Q=J[J.length-1],Z=$._cacheIndex;Q._cacheIndex=Z,J[Z]=Q,J.pop(),$._cacheIndex=null;let W=$._clip.uuid,K=this._actionsByClip,Y=K[W],q=Y.knownActions,G=q[q.length-1],V=$._byClipCacheIndex;G._byClipCacheIndex=V,q[V]=G,q.pop(),$._byClipCacheIndex=null;let H=Y.actionByRoot,N=($._localRoot||this._root).uuid;if(delete H[N],q.length===0)delete K[W];this._removeInactiveBindingsForAction($)}_removeInactiveBindingsForAction($){let J=$._propertyBindings;for(let Q=0,Z=J.length;Q!==Z;++Q){let W=J[Q];if(--W.referenceCount===0)this._removeInactiveBinding(W)}}_lendAction($){let J=this._actions,Q=$._cacheIndex,Z=this._nActiveActions++,W=J[Z];$._cacheIndex=Z,J[Z]=$,W._cacheIndex=Q,J[Q]=W}_takeBackAction($){let J=this._actions,Q=$._cacheIndex,Z=--this._nActiveActions,W=J[Z];$._cacheIndex=Z,J[Z]=$,W._cacheIndex=Q,J[Q]=W}_addInactiveBinding($,J,Q){let Z=this._bindingsByRootAndName,W=this._bindings,K=Z[J];if(K===void 0)K={},Z[J]=K;K[Q]=$,$._cacheIndex=W.length,W.push($)}_removeInactiveBinding($){let J=this._bindings,Q=$.binding,Z=Q.rootNode.uuid,W=Q.path,K=this._bindingsByRootAndName,Y=K[Z],q=J[J.length-1],G=$._cacheIndex;if(q._cacheIndex=G,J[G]=q,J.pop(),delete Y[W],Object.keys(Y).length===0)delete K[Z]}_lendBinding($){let J=this._bindings,Q=$._cacheIndex,Z=this._nActiveBindings++,W=J[Z];$._cacheIndex=Z,J[Z]=$,W._cacheIndex=Q,J[Q]=W}_takeBackBinding($){let J=this._bindings,Q=$._cacheIndex,Z=--this._nActiveBindings,W=J[Z];$._cacheIndex=Z,J[Z]=$,W._cacheIndex=Q,J[Q]=W}_lendControlInterpolant(){let $=this._controlInterpolants,J=this._nActiveControlInterpolants++,Q=$[J];if(Q===void 0)Q=new c1(new Float32Array(2),new Float32Array(2),1,WG),Q.__cacheIndex=J,$[J]=Q;return Q}_takeBackControlInterpolant($){let J=this._controlInterpolants,Q=$.__cacheIndex,Z=--this._nActiveControlInterpolants,W=J[Z];$.__cacheIndex=Z,J[Z]=$,W.__cacheIndex=Q,J[Q]=W}clipAction($,J,Q){let Z=J||this._root,W=Z.uuid,K=typeof $==="string"?EJ.findByName(Z,$):$,Y=K!==null?K.uuid:$,q=this._actionsByClip[Y],G=null;if(Q===void 0)if(K!==null)Q=K.blendMode;else Q=2500;if(q!==void 0){let H=q.actionByRoot[W];if(H!==void 0&&H.blendMode===Q)return H;if(G=q.knownActions[0],K===null)K=G._clip}if(K===null)return null;let V=new dK(this,K,J,Q);return this._bindAction(V,G),this._addInactiveAction(V,Y,W),V}existingAction($,J){let Q=J||this._root,Z=Q.uuid,W=typeof $==="string"?EJ.findByName(Q,$):$,K=W?W.uuid:$,Y=this._actionsByClip[K];if(Y!==void 0)return Y.actionByRoot[Z]||null;return null}stopAllAction(){let $=this._actions,J=this._nActiveActions;for(let Q=J-1;Q>=0;--Q)$[Q].stop();return this}update($){$*=this.timeScale;let J=this._actions,Q=this._nActiveActions,Z=this.time+=$,W=Math.sign($),K=this._accuIndex^=1;for(let G=0;G!==Q;++G)J[G]._update(Z,$,W,K);let Y=this._bindings,q=this._nActiveBindings;for(let G=0;G!==q;++G)Y[G].apply(K);return this}setTime($){this.time=0;for(let J=0;J<this._actions.length;J++)this._actions[J].time=0;return this.update($)}getRoot(){return this._root}uncacheClip($){let J=this._actions,Q=$.uuid,Z=this._actionsByClip,W=Z[Q];if(W!==void 0){let K=W.knownActions;for(let Y=0,q=K.length;Y!==q;++Y){let G=K[Y];this._deactivateAction(G);let V=G._cacheIndex,H=J[J.length-1];G._cacheIndex=null,G._byClipCacheIndex=null,H._cacheIndex=V,J[V]=H,J.pop(),this._removeInactiveBindingsForAction(G)}delete Z[Q]}}uncacheRoot($){let J=$.uuid,Q=this._actionsByClip;for(let K in Q){let Y=Q[K].actionByRoot,q=Y[J];if(q!==void 0)this._deactivateAction(q),this._removeInactiveAction(q)}let Z=this._bindingsByRootAndName,W=Z[J];if(W!==void 0)for(let K in W){let Y=W[K];Y.restoreOriginalState(),this._removeInactiveBinding(Y)}}uncacheAction($,J){let Q=this.existingAction($,J);if(Q!==null)this._deactivateAction(Q),this._removeInactiveAction(Q)}};v4=new q6;k8=new d,OJ=new q6,N1=new q6;iK=class iK extends h1{constructor($){let J=sK($),Q=new H7,Z=[],W=[];for(let G=0;G<J.length;G++){let V=J[G];if(V.parent&&V.parent.isBone)Z.push(0,0,0),Z.push(0,0,0),W.push(0,0,0),W.push(0,0,0)}Q.setAttribute("position",new x6(Z,3)),Q.setAttribute("color",new x6(W,3));let K=new MJ({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(Q,K);this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=$,this.bones=J,this.matrix=$.matrixWorld,this.matrixAutoUpdate=!1;let Y=new U6(255),q=new U6(65280);this.setColors(Y,q)}updateMatrixWorld($){let J=this.bones,Q=this.geometry,Z=Q.getAttribute("position");N1.copy(this.root.matrixWorld).invert();for(let W=0,K=0;W<J.length;W++){let Y=J[W];if(Y.parent&&Y.parent.isBone)OJ.multiplyMatrices(N1,Y.matrixWorld),k8.setFromMatrixPosition(OJ),Z.setXYZ(K,k8.x,k8.y,k8.z),OJ.multiplyMatrices(N1,Y.parent.matrixWorld),k8.setFromMatrixPosition(OJ),Z.setXYZ(K+1,k8.x,k8.y,k8.z),K+=2}Q.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld($)}setColors($,J){let Z=this.geometry.getAttribute("color");for(let W=0;W<Z.count;W+=2)Z.setXYZ(W,$.r,$.g,$.b),Z.setXYZ(W+1,J.r,J.g,J.b);return Z.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}};if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));if(typeof window<"u")if(window.__THREE__)console.warn("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="180";Y6={alphahash_fragment:YG,alphahash_pars_fragment:qG,alphamap_fragment:XG,alphamap_pars_fragment:GG,alphatest_fragment:VG,alphatest_pars_fragment:BG,aomap_fragment:HG,aomap_pars_fragment:NG,batching_pars_vertex:FG,batching_vertex:OG,begin_vertex:LG,beginnormal_vertex:PG,bsdfs:zG,iridescence_fragment:IG,bumpmap_pars_fragment:DG,clipping_planes_fragment:CG,clipping_planes_pars_fragment:RG,clipping_planes_pars_vertex:EG,clipping_planes_vertex:SG,color_fragment:AG,color_pars_fragment:jG,color_pars_vertex:wG,color_vertex:MG,common:TG,cube_uv_reflection_fragment:kG,defaultnormal_vertex:vG,displacementmap_pars_vertex:_G,displacementmap_vertex:yG,emissivemap_fragment:hG,emissivemap_pars_fragment:xG,colorspace_fragment:bG,colorspace_pars_fragment:fG,envmap_fragment:gG,envmap_common_pars_fragment:pG,envmap_pars_fragment:uG,envmap_pars_vertex:lG,envmap_physical_pars_fragment:eG,envmap_vertex:mG,fog_vertex:dG,fog_pars_vertex:cG,fog_fragment:nG,fog_pars_fragment:iG,gradientmap_pars_fragment:sG,lightmap_pars_fragment:oG,lights_lambert_fragment:aG,lights_lambert_pars_fragment:rG,lights_pars_begin:tG,lights_toon_fragment:$V,lights_toon_pars_fragment:JV,lights_phong_fragment:QV,lights_phong_pars_fragment:ZV,lights_physical_fragment:WV,lights_physical_pars_fragment:KV,lights_fragment_begin:UV,lights_fragment_maps:YV,lights_fragment_end:qV,logdepthbuf_fragment:XV,logdepthbuf_pars_fragment:GV,logdepthbuf_pars_vertex:VV,logdepthbuf_vertex:BV,map_fragment:HV,map_pars_fragment:NV,map_particle_fragment:FV,map_particle_pars_fragment:OV,metalnessmap_fragment:LV,metalnessmap_pars_fragment:PV,morphinstance_vertex:zV,morphcolor_vertex:IV,morphnormal_vertex:DV,morphtarget_pars_vertex:CV,morphtarget_vertex:RV,normal_fragment_begin:EV,normal_fragment_maps:SV,normal_pars_fragment:AV,normal_pars_vertex:jV,normal_vertex:wV,normalmap_pars_fragment:MV,clearcoat_normal_fragment_begin:TV,clearcoat_normal_fragment_maps:kV,clearcoat_pars_fragment:vV,iridescence_pars_fragment:_V,opaque_fragment:yV,packing:hV,premultiplied_alpha_fragment:xV,project_vertex:bV,dithering_fragment:fV,dithering_pars_fragment:gV,roughnessmap_fragment:pV,roughnessmap_pars_fragment:uV,shadowmap_pars_fragment:lV,shadowmap_pars_vertex:mV,shadowmap_vertex:dV,shadowmask_pars_fragment:cV,skinbase_vertex:nV,skinning_pars_vertex:iV,skinning_vertex:sV,skinnormal_vertex:oV,specularmap_fragment:aV,specularmap_pars_fragment:rV,tonemapping_fragment:tV,tonemapping_pars_fragment:eV,transmission_fragment:$B,transmission_pars_fragment:JB,uv_pars_fragment:QB,uv_pars_vertex:ZB,uv_vertex:WB,worldpos_vertex:KB,background_vert:UB,background_frag:YB,backgroundCube_vert:qB,backgroundCube_frag:XB,cube_vert:GB,cube_frag:VB,depth_vert:BB,depth_frag:HB,distanceRGBA_vert:NB,distanceRGBA_frag:FB,equirect_vert:OB,equirect_frag:LB,linedashed_vert:PB,linedashed_frag:zB,meshbasic_vert:IB,meshbasic_frag:DB,meshlambert_vert:CB,meshlambert_frag:RB,meshmatcap_vert:EB,meshmatcap_frag:SB,meshnormal_vert:AB,meshnormal_frag:jB,meshphong_vert:wB,meshphong_frag:MB,meshphysical_vert:TB,meshphysical_frag:kB,meshtoon_vert:vB,meshtoon_frag:_B,points_vert:yB,points_frag:hB,shadow_vert:xB,shadow_frag:bB,sprite_vert:fB,sprite_frag:gB},_0={common:{diffuse:{value:new U6(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new K6},alphaMap:{value:null},alphaMapTransform:{value:new K6},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new K6}},envmap:{envMap:{value:null},envMapRotation:{value:new K6},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new K6}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new K6}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new K6},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new K6},normalScale:{value:new V6(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new K6},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new K6}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new K6}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new K6}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new U6(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new U6(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new K6},alphaTest:{value:0},uvTransform:{value:new K6}},sprite:{diffuse:{value:new U6(16777215)},opacity:{value:1},center:{value:new V6(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new K6},alphaMap:{value:null},alphaMapTransform:{value:new K6},alphaTest:{value:0}}},d7={basic:{uniforms:V7([_0.common,_0.specularmap,_0.envmap,_0.aomap,_0.lightmap,_0.fog]),vertexShader:Y6.meshbasic_vert,fragmentShader:Y6.meshbasic_frag},lambert:{uniforms:V7([_0.common,_0.specularmap,_0.envmap,_0.aomap,_0.lightmap,_0.emissivemap,_0.bumpmap,_0.normalmap,_0.displacementmap,_0.fog,_0.lights,{emissive:{value:new U6(0)}}]),vertexShader:Y6.meshlambert_vert,fragmentShader:Y6.meshlambert_frag},phong:{uniforms:V7([_0.common,_0.specularmap,_0.envmap,_0.aomap,_0.lightmap,_0.emissivemap,_0.bumpmap,_0.normalmap,_0.displacementmap,_0.fog,_0.lights,{emissive:{value:new U6(0)},specular:{value:new U6(1118481)},shininess:{value:30}}]),vertexShader:Y6.meshphong_vert,fragmentShader:Y6.meshphong_frag},standard:{uniforms:V7([_0.common,_0.envmap,_0.aomap,_0.lightmap,_0.emissivemap,_0.bumpmap,_0.normalmap,_0.displacementmap,_0.roughnessmap,_0.metalnessmap,_0.fog,_0.lights,{emissive:{value:new U6(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Y6.meshphysical_vert,fragmentShader:Y6.meshphysical_frag},toon:{uniforms:V7([_0.common,_0.aomap,_0.lightmap,_0.emissivemap,_0.bumpmap,_0.normalmap,_0.displacementmap,_0.gradientmap,_0.fog,_0.lights,{emissive:{value:new U6(0)}}]),vertexShader:Y6.meshtoon_vert,fragmentShader:Y6.meshtoon_frag},matcap:{uniforms:V7([_0.common,_0.bumpmap,_0.normalmap,_0.displacementmap,_0.fog,{matcap:{value:null}}]),vertexShader:Y6.meshmatcap_vert,fragmentShader:Y6.meshmatcap_frag},points:{uniforms:V7([_0.points,_0.fog]),vertexShader:Y6.points_vert,fragmentShader:Y6.points_frag},dashed:{uniforms:V7([_0.common,_0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Y6.linedashed_vert,fragmentShader:Y6.linedashed_frag},depth:{uniforms:V7([_0.common,_0.displacementmap]),vertexShader:Y6.depth_vert,fragmentShader:Y6.depth_frag},normal:{uniforms:V7([_0.common,_0.bumpmap,_0.normalmap,_0.displacementmap,{opacity:{value:1}}]),vertexShader:Y6.meshnormal_vert,fragmentShader:Y6.meshnormal_frag},sprite:{uniforms:V7([_0.sprite,_0.fog]),vertexShader:Y6.sprite_vert,fragmentShader:Y6.sprite_frag},background:{uniforms:{uvTransform:{value:new K6},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Y6.background_vert,fragmentShader:Y6.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new K6}},vertexShader:Y6.backgroundCube_vert,fragmentShader:Y6.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Y6.cube_vert,fragmentShader:Y6.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Y6.equirect_vert,fragmentShader:Y6.equirect_frag},distanceRGBA:{uniforms:V7([_0.common,_0.displacementmap,{referencePosition:{value:new d},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:Y6.distanceRGBA_vert,fragmentShader:Y6.distanceRGBA_frag},shadow:{uniforms:V7([_0.lights,_0.fog,{color:{value:new U6(0)},opacity:{value:1}}]),vertexShader:Y6.shadow_vert,fragmentShader:Y6.shadow_frag}};d7.physical={uniforms:V7([d7.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new K6},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new K6},clearcoatNormalScale:{value:new V6(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new K6},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new K6},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new K6},sheen:{value:0},sheenColor:{value:new U6(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new K6},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new K6},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new K6},transmissionSamplerSize:{value:new V6},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new K6},attenuationDistance:{value:0},attenuationColor:{value:new U6(0)},specularColor:{value:new U6(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new K6},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new K6},anisotropyVector:{value:new V6},anisotropyMap:{value:null},anisotropyMapTransform:{value:new K6}}]),vertexShader:Y6.meshphysical_vert,fragmentShader:Y6.meshphysical_frag};LJ={r:0,b:0,g:0},K$=new c7,pB=new q6;h4=[0.125,0.215,0.35,0.446,0.526,0.582],F1=new yJ,x4=new U6,Y$=(1+Math.sqrt(5))/2,m$=1/Y$,b4=[new d(-Y$,m$,0),new d(Y$,m$,0),new d(-m$,0,Y$),new d(m$,0,Y$),new d(0,Y$,-m$),new d(0,Y$,m$),new d(-1,1,-1),new d(1,1,-1),new d(-1,1,1),new d(1,1,1)],iB=new d;aK=new t6,u4=new b1(1,1),rK=new A1,tK=new YK,eK=new T1,l4=[],m4=[],d4=new Float32Array(16),c4=new Float32Array(9),n4=new Float32Array(4);I1=/(\w+)(\])?(\[|\.)?/g;o4=new K6;zJ=new d;$H=/^[ \t]*#include +<([\w\d./]+)>/gm;JH=new Map;ZH=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;SH={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};U3=class U3 extends _8{constructor($,J){super();let Q=this,Z=null,W=1,K=null,Y="local-floor",q=1,G=null,V=null,H=null,N=null,O=null,P=null,D=typeof XRWebGLBinding<"u",C=new K3,z={},L=J.getContextAttributes(),T=null,R=null,v=[],g=[],y=new V6,M=null,p=new B7;p.viewport=new S6;let A=new B7;A.viewport=new S6;let j=[p,A],h=new uK,l=null,m=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(q0){let S0=v[q0];if(S0===void 0)S0=new IJ,v[q0]=S0;return S0.getTargetRaySpace()},this.getControllerGrip=function(q0){let S0=v[q0];if(S0===void 0)S0=new IJ,v[q0]=S0;return S0.getGripSpace()},this.getHand=function(q0){let S0=v[q0];if(S0===void 0)S0=new IJ,v[q0]=S0;return S0.getHandSpace()};function n(q0){let S0=g.indexOf(q0.inputSource);if(S0===-1)return;let A0=v[S0];if(A0!==void 0)A0.update(q0.inputSource,q0.frame,G||K),A0.dispatchEvent({type:q0.type,data:q0.inputSource})}function o(){Z.removeEventListener("select",n),Z.removeEventListener("selectstart",n),Z.removeEventListener("selectend",n),Z.removeEventListener("squeeze",n),Z.removeEventListener("squeezestart",n),Z.removeEventListener("squeezeend",n),Z.removeEventListener("end",o),Z.removeEventListener("inputsourceschange",$0);for(let q0=0;q0<v.length;q0++){let S0=g[q0];if(S0===null)continue;g[q0]=null,v[q0].disconnect(S0)}l=null,m=null,C.reset();for(let q0 in z)delete z[q0];$.setRenderTarget(T),O=null,N=null,H=null,Z=null,R=null,B6.stop(),Q.isPresenting=!1,$.setPixelRatio(M),$.setSize(y.width,y.height,!1),Q.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(q0){if(W=q0,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(q0){if(Y=q0,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return G||K},this.setReferenceSpace=function(q0){G=q0},this.getBaseLayer=function(){return N!==null?N:O},this.getBinding=function(){if(H===null&&D)H=new XRWebGLBinding(Z,J);return H},this.getFrame=function(){return P},this.getSession=function(){return Z},this.setSession=async function(q0){if(Z=q0,Z!==null){if(T=$.getRenderTarget(),Z.addEventListener("select",n),Z.addEventListener("selectstart",n),Z.addEventListener("selectend",n),Z.addEventListener("squeeze",n),Z.addEventListener("squeezestart",n),Z.addEventListener("squeezeend",n),Z.addEventListener("end",o),Z.addEventListener("inputsourceschange",$0),L.xrCompatible!==!0)await J.makeXRCompatible();if(M=$.getPixelRatio(),$.getSize(y),!(D&&("createProjectionLayer"in XRWebGLBinding.prototype))){let A0={antialias:L.antialias,alpha:!0,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:W};O=new XRWebGLLayer(Z,J,A0),Z.updateRenderState({baseLayer:O}),$.setPixelRatio(1),$.setSize(O.framebufferWidth,O.framebufferHeight,!1),R=new G8(O.framebufferWidth,O.framebufferHeight,{format:1023,type:1009,colorSpace:$.outputColorSpace,stencilBuffer:L.stencil,resolveDepthBuffer:O.ignoreDepthValues===!1,resolveStencilBuffer:O.ignoreDepthValues===!1})}else{let A0=null,l0=null,z0=null;if(L.depth)z0=L.stencil?J.DEPTH24_STENCIL8:J.DEPTH_COMPONENT24,A0=L.stencil?1027:1026,l0=L.stencil?1020:1014;let e0={colorFormat:J.RGBA8,depthFormat:z0,scaleFactor:W};H=this.getBinding(),N=H.createProjectionLayer(e0),Z.updateRenderState({layers:[N]}),$.setPixelRatio(1),$.setSize(N.textureWidth,N.textureHeight,!1),R=new G8(N.textureWidth,N.textureHeight,{format:1023,type:1009,depthTexture:new b1(N.textureWidth,N.textureHeight,l0,void 0,void 0,void 0,void 0,void 0,void 0,A0),stencilBuffer:L.stencil,colorSpace:$.outputColorSpace,samples:L.antialias?4:0,resolveDepthBuffer:N.ignoreDepthValues===!1,resolveStencilBuffer:N.ignoreDepthValues===!1})}R.isXRRenderTarget=!0,this.setFoveation(q),G=null,K=await Z.requestReferenceSpace(Y),B6.setContext(Z),B6.start(),Q.isPresenting=!0,Q.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return C.getDepthTexture()};function $0(q0){for(let S0=0;S0<q0.removed.length;S0++){let A0=q0.removed[S0],l0=g.indexOf(A0);if(l0>=0)g[l0]=null,v[l0].disconnect(A0)}for(let S0=0;S0<q0.added.length;S0++){let A0=q0.added[S0],l0=g.indexOf(A0);if(l0===-1){for(let e0=0;e0<v.length;e0++)if(e0>=g.length){g.push(A0),l0=e0;break}else if(g[e0]===null){g[e0]=A0,l0=e0;break}if(l0===-1)break}let z0=v[l0];if(z0)z0.connect(A0)}}let F0=new d,J0=new d;function I0(q0,S0,A0){F0.setFromMatrixPosition(S0.matrixWorld),J0.setFromMatrixPosition(A0.matrixWorld);let l0=F0.distanceTo(J0),z0=S0.projectionMatrix.elements,e0=A0.projectionMatrix.elements,Q6=z0[14]/(z0[10]-1),x=z0[14]/(z0[10]+1),D6=(z0[9]+1)/z0[5],s0=(z0[9]-1)/z0[5],o0=(z0[8]-1)/z0[0],g0=(e0[8]+1)/e0[0],A6=Q6*o0,w0=Q6*g0,c0=l0/(-o0+g0),X6=c0*-o0;if(S0.matrixWorld.decompose(q0.position,q0.quaternion,q0.scale),q0.translateX(X6),q0.translateZ(c0),q0.matrixWorld.compose(q0.position,q0.quaternion,q0.scale),q0.matrixWorldInverse.copy(q0.matrixWorld).invert(),z0[10]===-1)q0.projectionMatrix.copy(S0.projectionMatrix),q0.projectionMatrixInverse.copy(S0.projectionMatrixInverse);else{let C6=Q6+c0,_6=x+c0,_=A6-X6,E=w0+(l0-X6),u=D6*x/_6*C6,W0=s0*x/_6*C6;q0.projectionMatrix.makePerspective(_,E,u,W0,C6,_6),q0.projectionMatrixInverse.copy(q0.projectionMatrix).invert()}}function y0(q0,S0){if(S0===null)q0.matrixWorld.copy(q0.matrix);else q0.matrixWorld.multiplyMatrices(S0.matrixWorld,q0.matrix);q0.matrixWorldInverse.copy(q0.matrixWorld).invert()}this.updateCamera=function(q0){if(Z===null)return;let{near:S0,far:A0}=q0;if(C.texture!==null){if(C.depthNear>0)S0=C.depthNear;if(C.depthFar>0)A0=C.depthFar}if(h.near=A.near=p.near=S0,h.far=A.far=p.far=A0,l!==h.near||m!==h.far)Z.updateRenderState({depthNear:h.near,depthFar:h.far}),l=h.near,m=h.far;h.layers.mask=q0.layers.mask|6,p.layers.mask=h.layers.mask&3,A.layers.mask=h.layers.mask&5;let l0=q0.parent,z0=h.cameras;y0(h,l0);for(let e0=0;e0<z0.length;e0++)y0(z0[e0],l0);if(z0.length===2)I0(h,p,A);else h.projectionMatrix.copy(p.projectionMatrix);u0(q0,h,l0)};function u0(q0,S0,A0){if(A0===null)q0.matrix.copy(S0.matrixWorld);else q0.matrix.copy(A0.matrixWorld),q0.matrix.invert(),q0.matrix.multiply(S0.matrixWorld);if(q0.matrix.decompose(q0.position,q0.quaternion,q0.scale),q0.updateMatrixWorld(!0),q0.projectionMatrix.copy(S0.projectionMatrix),q0.projectionMatrixInverse.copy(S0.projectionMatrixInverse),q0.isPerspectiveCamera)q0.fov=i$*2*Math.atan(1/q0.projectionMatrix.elements[5]),q0.zoom=1}this.getCamera=function(){return h},this.getFoveation=function(){if(N===null&&O===null)return;return q},this.setFoveation=function(q0){if(q=q0,N!==null)N.fixedFoveation=q0;if(O!==null&&O.fixedFoveation!==void 0)O.fixedFoveation=q0},this.hasDepthSensing=function(){return C.texture!==null},this.getDepthSensingMesh=function(){return C.getMesh(h)},this.getCameraTexture=function(q0){return z[q0]};let t0=null;function O6(q0,S0){if(V=S0.getViewerPose(G||K),P=S0,V!==null){let A0=V.views;if(O!==null)$.setRenderTargetFramebuffer(R,O.framebuffer),$.setRenderTarget(R);let l0=!1;if(A0.length!==h.cameras.length)h.cameras.length=0,l0=!0;for(let x=0;x<A0.length;x++){let D6=A0[x],s0=null;if(O!==null)s0=O.getViewport(D6);else{let g0=H.getViewSubImage(N,D6);if(s0=g0.viewport,x===0)$.setRenderTargetTextures(R,g0.colorTexture,g0.depthStencilTexture),$.setRenderTarget(R)}let o0=j[x];if(o0===void 0)o0=new B7,o0.layers.enable(x),o0.viewport=new S6,j[x]=o0;if(o0.matrix.fromArray(D6.transform.matrix),o0.matrix.decompose(o0.position,o0.quaternion,o0.scale),o0.projectionMatrix.fromArray(D6.projectionMatrix),o0.projectionMatrixInverse.copy(o0.projectionMatrix).invert(),o0.viewport.set(s0.x,s0.y,s0.width,s0.height),x===0)h.matrix.copy(o0.matrix),h.matrix.decompose(h.position,h.quaternion,h.scale);if(l0===!0)h.cameras.push(o0)}let z0=Z.enabledFeatures;if(z0&&z0.includes("depth-sensing")&&Z.depthUsage=="gpu-optimized"&&D){H=Q.getBinding();let x=H.getDepthInformation(A0[0]);if(x&&x.isValid&&x.texture)C.init(x,Z.renderState)}if(z0&&z0.includes("camera-access")&&D){$.state.unbindTexture(),H=Q.getBinding();for(let x=0;x<A0.length;x++){let D6=A0[x].camera;if(D6){let s0=z[D6];if(!s0)s0=new f1,z[D6]=s0;let o0=H.getCameraImage(D6);s0.sourceTexture=o0}}}}for(let A0=0;A0<v.length;A0++){let l0=g[A0],z0=v[A0];if(l0!==null&&z0!==void 0)z0.update(l0,S0,G||K)}if(t0)t0(q0,S0);if(S0.detectedPlanes)Q.dispatchEvent({type:"planesdetected",data:S0});P=null}let B6=new oK;B6.setAnimationLoop(O6),this.setAnimationLoop=function(q0){t0=q0},this.dispose=function(){}}};U$=new c7,kH=new q6;t1=fK,r5=EJ,Z5=cK,e1=_1,$Z=i7,JZ=t$,B8=L7,V$=H7,xJ=zK,P7=U6,bJ=I6,fJ=g1,QZ=kJ,W5=s5,ZZ=TK,K5=XK,t5=bK,pJ=i1,uJ=x6,J9=k1,h8=d$,UZ=p1,YZ=pK,lJ=DJ,qZ=OK,mJ=NK,dJ=v1,XZ=e$,VZ=TJ,BZ=MJ,HZ=LK,NZ=h1,OZ=y8,B$=gK,Q9=V8,zZ=NX,F8=q6,O8=O7,H$=jJ,j7=IK,L8=d1,sJ=o$,oJ=u6,EZ=u1,K9=yJ,U9=B7,Y9=o5,Y5=hK,q9=PK,SZ=x1,AZ=j6,x8=f7,q5=$5,tJ=nK,eJ=HK,$Q=n7,jZ=y1,wZ=iK,MZ=FK,G9=g7,TZ=l1,kZ=_K,JQ=t6,X5=kK,vZ=m1,F$=V6,l6=d,V5=a$,QQ=G8,yZ=Y3});function hZ($,J){if(J===_Z)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),$;if(J===G5||J===V9){let Q=$.getIndex();if(Q===null){let Y=[],q=$.getAttribute("position");if(q!==void 0){for(let G=0;G<q.count;G++)Y.push(G);$.setIndex(Y),Q=$.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),$}let Z=Q.count-2,W=[];if(J===G5)for(let Y=1;Y<=Z;Y++)W.push(Q.getX(0)),W.push(Q.getX(Y)),W.push(Q.getX(Y+1));else for(let Y=0;Y<Z;Y++)if(Y%2===0)W.push(Q.getX(Y)),W.push(Q.getX(Y+1)),W.push(Q.getX(Y+2));else W.push(Q.getX(Y+2)),W.push(Q.getX(Y+1)),W.push(Q.getX(Y));if(W.length/3!==Z)console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let K=$.clone();return K.setIndex(W),K.clearGroups(),K}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",J),$}var q3=_5(()=>{B5()});var g3={};pQ(g3,{GLTFLoader:()=>H3});function hH(){let $={};return{get:function(J){return $[J]},add:function(J,Q){$[J]=Q},remove:function(J){delete $[J]},removeAll:function(){$={}}}}class N3{constructor($){this.parser=$,this.name=N6.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let $=this.parser,J=this.parser.json.nodes||[];for(let Q=0,Z=J.length;Q<Z;Q++){let W=J[Q];if(W.extensions&&W.extensions[this.name]&&W.extensions[this.name].light!==void 0)$._addNodeRef(this.cache,W.extensions[this.name].light)}}_loadLight($){let J=this.parser,Q="light:"+$,Z=J.cache.get(Q);if(Z)return Z;let W=J.json,q=((W.extensions&&W.extensions[this.name]||{}).lights||[])[$],G,V=new P7(16777215);if(q.color!==void 0)V.setRGB(q.color[0],q.color[1],q.color[2],Y7);let H=q.range!==void 0?q.range:0;switch(q.type){case"directional":G=new t5(V),G.target.position.set(0,0,-1),G.add(G.target);break;case"point":G=new Y5(V),G.distance=H;break;case"spot":G=new kZ(V),G.distance=H,q.spot=q.spot||{},q.spot.innerConeAngle=q.spot.innerConeAngle!==void 0?q.spot.innerConeAngle:0,q.spot.outerConeAngle=q.spot.outerConeAngle!==void 0?q.spot.outerConeAngle:Math.PI/4,G.angle=q.spot.outerConeAngle,G.penumbra=1-q.spot.innerConeAngle/q.spot.outerConeAngle,G.target.position.set(0,0,-1),G.add(G.target);break;default:throw Error("THREE.GLTFLoader: Unexpected light type: "+q.type)}if(G.position.set(0,0,0),o7(G,q),q.intensity!==void 0)G.intensity=q.intensity;return G.name=J.createUniqueName(q.name||"light_"+$),Z=Promise.resolve(G),J.cache.add(Q,Z),Z}getDependency($,J){if($!=="light")return;return this._loadLight(J)}createNodeAttachment($){let J=this,Q=this.parser,W=Q.json.nodes[$],Y=(W.extensions&&W.extensions[this.name]||{}).light;if(Y===void 0)return null;return this._loadLight(Y).then(function(q){return Q._getNodeRef(J.cache,Y,q)})}}class F3{constructor(){this.name=N6.KHR_MATERIALS_UNLIT}getMaterialType(){return H$}extendParams($,J,Q){let Z=[];$.color=new P7(1,1,1),$.opacity=1;let W=J.pbrMetallicRoughness;if(W){if(Array.isArray(W.baseColorFactor)){let K=W.baseColorFactor;$.color.setRGB(K[0],K[1],K[2],Y7),$.opacity=K[3]}if(W.baseColorTexture!==void 0)Z.push(Q.assignTexture($,"map",W.baseColorTexture,s7))}return Promise.all(Z)}}class O3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=Z.extensions[this.name].emissiveStrength;if(W!==void 0)J.emissiveIntensity=W;return Promise.resolve()}}class L3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_CLEARCOAT}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(K.clearcoatFactor!==void 0)J.clearcoat=K.clearcoatFactor;if(K.clearcoatTexture!==void 0)W.push(Q.assignTexture(J,"clearcoatMap",K.clearcoatTexture));if(K.clearcoatRoughnessFactor!==void 0)J.clearcoatRoughness=K.clearcoatRoughnessFactor;if(K.clearcoatRoughnessTexture!==void 0)W.push(Q.assignTexture(J,"clearcoatRoughnessMap",K.clearcoatRoughnessTexture));if(K.clearcoatNormalTexture!==void 0){if(W.push(Q.assignTexture(J,"clearcoatNormalMap",K.clearcoatNormalTexture)),K.clearcoatNormalTexture.scale!==void 0){let Y=K.clearcoatNormalTexture.scale;J.clearcoatNormalScale=new F$(Y,Y)}}return Promise.all(W)}}class P3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_DISPERSION}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=Z.extensions[this.name];return J.dispersion=W.dispersion!==void 0?W.dispersion:0,Promise.resolve()}}class z3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_IRIDESCENCE}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(K.iridescenceFactor!==void 0)J.iridescence=K.iridescenceFactor;if(K.iridescenceTexture!==void 0)W.push(Q.assignTexture(J,"iridescenceMap",K.iridescenceTexture));if(K.iridescenceIor!==void 0)J.iridescenceIOR=K.iridescenceIor;if(J.iridescenceThicknessRange===void 0)J.iridescenceThicknessRange=[100,400];if(K.iridescenceThicknessMinimum!==void 0)J.iridescenceThicknessRange[0]=K.iridescenceThicknessMinimum;if(K.iridescenceThicknessMaximum!==void 0)J.iridescenceThicknessRange[1]=K.iridescenceThicknessMaximum;if(K.iridescenceThicknessTexture!==void 0)W.push(Q.assignTexture(J,"iridescenceThicknessMap",K.iridescenceThicknessTexture));return Promise.all(W)}}class I3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_SHEEN}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[];J.sheenColor=new P7(0,0,0),J.sheenRoughness=0,J.sheen=1;let K=Z.extensions[this.name];if(K.sheenColorFactor!==void 0){let Y=K.sheenColorFactor;J.sheenColor.setRGB(Y[0],Y[1],Y[2],Y7)}if(K.sheenRoughnessFactor!==void 0)J.sheenRoughness=K.sheenRoughnessFactor;if(K.sheenColorTexture!==void 0)W.push(Q.assignTexture(J,"sheenColorMap",K.sheenColorTexture,s7));if(K.sheenRoughnessTexture!==void 0)W.push(Q.assignTexture(J,"sheenRoughnessMap",K.sheenRoughnessTexture));return Promise.all(W)}}class D3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_TRANSMISSION}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(K.transmissionFactor!==void 0)J.transmission=K.transmissionFactor;if(K.transmissionTexture!==void 0)W.push(Q.assignTexture(J,"transmissionMap",K.transmissionTexture));return Promise.all(W)}}class C3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_VOLUME}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(J.thickness=K.thicknessFactor!==void 0?K.thicknessFactor:0,K.thicknessTexture!==void 0)W.push(Q.assignTexture(J,"thicknessMap",K.thicknessTexture));J.attenuationDistance=K.attenuationDistance||1/0;let Y=K.attenuationColor||[1,1,1];return J.attenuationColor=new P7().setRGB(Y[0],Y[1],Y[2],Y7),Promise.all(W)}}class R3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_IOR}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Z=this.parser.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=Z.extensions[this.name];return J.ior=W.ior!==void 0?W.ior:1.5,Promise.resolve()}}class E3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_SPECULAR}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(J.specularIntensity=K.specularFactor!==void 0?K.specularFactor:1,K.specularTexture!==void 0)W.push(Q.assignTexture(J,"specularIntensityMap",K.specularTexture));let Y=K.specularColorFactor||[1,1,1];if(J.specularColor=new P7().setRGB(Y[0],Y[1],Y[2],Y7),K.specularColorTexture!==void 0)W.push(Q.assignTexture(J,"specularColorMap",K.specularColorTexture,s7));return Promise.all(W)}}class S3{constructor($){this.parser=$,this.name=N6.EXT_MATERIALS_BUMP}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(J.bumpScale=K.bumpFactor!==void 0?K.bumpFactor:1,K.bumpTexture!==void 0)W.push(Q.assignTexture(J,"bumpMap",K.bumpTexture));return Promise.all(W)}}class A3{constructor($){this.parser=$,this.name=N6.KHR_MATERIALS_ANISOTROPY}getMaterialType($){let Q=this.parser.json.materials[$];if(!Q.extensions||!Q.extensions[this.name])return null;return j7}extendMaterialParams($,J){let Q=this.parser,Z=Q.json.materials[$];if(!Z.extensions||!Z.extensions[this.name])return Promise.resolve();let W=[],K=Z.extensions[this.name];if(K.anisotropyStrength!==void 0)J.anisotropy=K.anisotropyStrength;if(K.anisotropyRotation!==void 0)J.anisotropyRotation=K.anisotropyRotation;if(K.anisotropyTexture!==void 0)W.push(Q.assignTexture(J,"anisotropyMap",K.anisotropyTexture));return Promise.all(W)}}class j3{constructor($){this.parser=$,this.name=N6.KHR_TEXTURE_BASISU}loadTexture($){let J=this.parser,Q=J.json,Z=Q.textures[$];if(!Z.extensions||!Z.extensions[this.name])return null;let W=Z.extensions[this.name],K=J.options.ktx2Loader;if(!K)if(Q.extensionsRequired&&Q.extensionsRequired.indexOf(this.name)>=0)throw Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");else return null;return J.loadTextureImage($,W.source,K)}}class w3{constructor($){this.parser=$,this.name=N6.EXT_TEXTURE_WEBP}loadTexture($){let J=this.name,Q=this.parser,Z=Q.json,W=Z.textures[$];if(!W.extensions||!W.extensions[J])return null;let K=W.extensions[J],Y=Z.images[K.source],q=Q.textureLoader;if(Y.uri){let G=Q.options.manager.getHandler(Y.uri);if(G!==null)q=G}return Q.loadTextureImage($,K.source,q)}}class M3{constructor($){this.parser=$,this.name=N6.EXT_TEXTURE_AVIF}loadTexture($){let J=this.name,Q=this.parser,Z=Q.json,W=Z.textures[$];if(!W.extensions||!W.extensions[J])return null;let K=W.extensions[J],Y=Z.images[K.source],q=Q.textureLoader;if(Y.uri){let G=Q.options.manager.getHandler(Y.uri);if(G!==null)q=G}return Q.loadTextureImage($,K.source,q)}}class T3{constructor($){this.name=N6.EXT_MESHOPT_COMPRESSION,this.parser=$}loadBufferView($){let J=this.parser.json,Q=J.bufferViews[$];if(Q.extensions&&Q.extensions[this.name]){let Z=Q.extensions[this.name],W=this.parser.getDependency("buffer",Z.buffer),K=this.parser.options.meshoptDecoder;if(!K||!K.supported)if(J.extensionsRequired&&J.extensionsRequired.indexOf(this.name)>=0)throw Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");else return null;return W.then(function(Y){let q=Z.byteOffset||0,G=Z.byteLength||0,V=Z.count,H=Z.byteStride,N=new Uint8Array(Y,q,G);if(K.decodeGltfBufferAsync)return K.decodeGltfBufferAsync(V,H,N,Z.mode,Z.filter).then(function(O){return O.buffer});else return K.ready.then(function(){let O=new ArrayBuffer(V*H);return K.decodeGltfBuffer(new Uint8Array(O),V,H,N,Z.mode,Z.filter),O})})}else return null}}class k3{constructor($){this.name=N6.EXT_MESH_GPU_INSTANCING,this.parser=$}createNodeMesh($){let J=this.parser.json,Q=J.nodes[$];if(!Q.extensions||!Q.extensions[this.name]||Q.mesh===void 0)return null;let Z=J.meshes[Q.mesh];for(let G of Z.primitives)if(G.mode!==w7.TRIANGLES&&G.mode!==w7.TRIANGLE_STRIP&&G.mode!==w7.TRIANGLE_FAN&&G.mode!==void 0)return null;let K=Q.extensions[this.name].attributes,Y=[],q={};for(let G in K)Y.push(this.parser.getDependency("accessor",K[G]).then((V)=>{return q[G]=V,q[G]}));if(Y.length<1)return null;return Y.push(this.parser.createNodeMesh($)),Promise.all(Y).then((G)=>{let V=G.pop(),H=V.isGroup?V.children:[V],N=G[0].count,O=[];for(let P of H){let D=new F8,C=new l6,z=new x8,L=new l6(1,1,1),T=new qZ(P.geometry,P.material,N);for(let R=0;R<N;R++){if(q.TRANSLATION)C.fromBufferAttribute(q.TRANSLATION,R);if(q.ROTATION)z.fromBufferAttribute(q.ROTATION,R);if(q.SCALE)L.fromBufferAttribute(q.SCALE,R);T.setMatrixAt(R,D.compose(C,z,L))}for(let R in q)if(R==="_COLOR_0"){let v=q[R];T.instanceColor=new lJ(v.array,v.itemSize,v.normalized)}else if(R!=="TRANSLATION"&&R!=="ROTATION"&&R!=="SCALE")P.geometry.setAttribute(R,q[R]);oJ.prototype.copy.call(T,P),this.parser.assignFinalMaterial(T),O.push(T)}if(V.isGroup)return V.clear(),V.add(...O),V;return O[0]})}}class _3{constructor($){this.name=N6.KHR_BINARY_GLTF,this.content=null,this.body=null;let J=new DataView($,0,B9),Q=new TextDecoder;if(this.header={magic:Q.decode(new Uint8Array($.slice(0,4))),version:J.getUint32(4,!0),length:J.getUint32(8,!0)},this.header.magic!==v3)throw Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");else if(this.header.version<2)throw Error("THREE.GLTFLoader: Legacy binary file detected.");let Z=this.header.length-B9,W=new DataView($,B9),K=0;while(K<Z){let Y=W.getUint32(K,!0);K+=4;let q=W.getUint32(K,!0);if(K+=4,q===X3.JSON){let G=new Uint8Array($,B9+K,Y);this.content=Q.decode(G)}else if(q===X3.BIN){let G=B9+K;this.body=$.slice(G,G+Y)}K+=Y}if(this.content===null)throw Error("THREE.GLTFLoader: JSON content not found.")}}class y3{constructor($,J){if(!J)throw Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=N6.KHR_DRACO_MESH_COMPRESSION,this.json=$,this.dracoLoader=J,this.dracoLoader.preload()}decodePrimitive($,J){let Q=this.json,Z=this.dracoLoader,W=$.extensions[this.name].bufferView,K=$.extensions[this.name].attributes,Y={},q={},G={};for(let V in K){let H=gZ[V]||V.toLowerCase();Y[H]=K[V]}for(let V in $.attributes){let H=gZ[V]||V.toLowerCase();if(K[V]!==void 0){let N=Q.accessors[$.attributes[V]],O=H5[N.componentType];G[H]=O.name,q[H]=N.normalized===!0}}return J.getDependency("bufferView",W).then(function(V){return new Promise(function(H,N){Z.decodeDracoFile(V,function(O){for(let P in O.attributes){let D=O.attributes[P],C=q[P];if(C!==void 0)D.normalized=C}H(O)},Y,G,Y7,N)})})}}class h3{constructor(){this.name=N6.KHR_TEXTURE_TRANSFORM}extendTexture($,J){if((J.texCoord===void 0||J.texCoord===$.channel)&&J.offset===void 0&&J.rotation===void 0&&J.scale===void 0)return $;if($=$.clone(),J.texCoord!==void 0)$.channel=J.texCoord;if(J.offset!==void 0)$.offset.fromArray(J.offset);if(J.rotation!==void 0)$.rotation=J.rotation;if(J.scale!==void 0)$.repeat.fromArray(J.scale);return $.needsUpdate=!0,$}}class x3{constructor(){this.name=N6.KHR_MESH_QUANTIZATION}}function fH($){if($.DefaultMaterial===void 0)$.DefaultMaterial=new L8({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:KZ});return $.DefaultMaterial}function O$($,J,Q){for(let Z in Q.extensions)if($[Z]===void 0)J.userData.gltfExtensions=J.userData.gltfExtensions||{},J.userData.gltfExtensions[Z]=Q.extensions[Z]}function o7($,J){if(J.extras!==void 0)if(typeof J.extras==="object")Object.assign($.userData,J.extras);else console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+J.extras)}function gH($,J,Q){let Z=!1,W=!1,K=!1;for(let V=0,H=J.length;V<H;V++){let N=J[V];if(N.POSITION!==void 0)Z=!0;if(N.NORMAL!==void 0)W=!0;if(N.COLOR_0!==void 0)K=!0;if(Z&&W&&K)break}if(!Z&&!W&&!K)return Promise.resolve($);let Y=[],q=[],G=[];for(let V=0,H=J.length;V<H;V++){let N=J[V];if(Z){let O=N.POSITION!==void 0?Q.getDependency("accessor",N.POSITION):$.attributes.position;Y.push(O)}if(W){let O=N.NORMAL!==void 0?Q.getDependency("accessor",N.NORMAL):$.attributes.normal;q.push(O)}if(K){let O=N.COLOR_0!==void 0?Q.getDependency("accessor",N.COLOR_0):$.attributes.color;G.push(O)}}return Promise.all([Promise.all(Y),Promise.all(q),Promise.all(G)]).then(function(V){let H=V[0],N=V[1],O=V[2];if(Z)$.morphAttributes.position=H;if(W)$.morphAttributes.normal=N;if(K)$.morphAttributes.color=O;return $.morphTargetsRelative=!0,$})}function pH($,J){if($.updateMorphTargets(),J.weights!==void 0)for(let Q=0,Z=J.weights.length;Q<Z;Q++)$.morphTargetInfluences[Q]=J.weights[Q];if(J.extras&&Array.isArray(J.extras.targetNames)){let Q=J.extras.targetNames;if($.morphTargetInfluences.length===Q.length){$.morphTargetDictionary={};for(let Z=0,W=Q.length;Z<W;Z++)$.morphTargetDictionary[Q[Z]]=Z}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function uH($){let J,Q=$.extensions&&$.extensions[N6.KHR_DRACO_MESH_COMPRESSION];if(Q)J="draco:"+Q.bufferView+":"+Q.indices+":"+fZ(Q.attributes);else J=$.indices+":"+fZ($.attributes)+":"+$.mode;if($.targets!==void 0)for(let Z=0,W=$.targets.length;Z<W;Z++)J+=":"+fZ($.targets[Z]);return J}function fZ($){let J="",Q=Object.keys($).sort();for(let Z=0,W=Q.length;Z<W;Z++)J+=Q[Z]+":"+$[Q[Z]]+";";return J}function pZ($){switch($){case Int8Array:return 0.007874015748031496;case Uint8Array:return 0.00392156862745098;case Int16Array:return 0.00003051850947599719;case Uint16Array:return 0.000015259021896696422;default:throw Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function lH($){if($.search(/\.jpe?g($|\?)/i)>0||$.search(/^data\:image\/jpeg/)===0)return"image/jpeg";if($.search(/\.webp($|\?)/i)>0||$.search(/^data\:image\/webp/)===0)return"image/webp";if($.search(/\.ktx2($|\?)/i)>0||$.search(/^data\:image\/ktx2/)===0)return"image/ktx2";return"image/png"}class f3{constructor($={},J={}){this.json=$,this.extensions={},this.plugins={},this.options=J,this.cache=new hH,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let Q=!1,Z=-1,W=!1,K=-1;if(typeof navigator<"u"){let Y=navigator.userAgent;Q=/^((?!chrome|android).)*safari/i.test(Y)===!0;let q=Y.match(/Version\/(\d+)/);Z=Q&&q?parseInt(q[1],10):-1,W=Y.indexOf("Firefox")>-1,K=W?Y.match(/Firefox\/([0-9]+)\./)[1]:-1}if(typeof createImageBitmap>"u"||Q&&Z<17||W&&K<98)this.textureLoader=new X5(this.options.manager);else this.textureLoader=new YZ(this.options.manager);if(this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new pJ(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials")this.fileLoader.setWithCredentials(!0)}setExtensions($){this.extensions=$}setPlugins($){this.plugins=$}parse($,J){let Q=this,Z=this.json,W=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(K){return K._markDefs&&K._markDefs()}),Promise.all(this._invokeAll(function(K){return K.beforeRoot&&K.beforeRoot()})).then(function(){return Promise.all([Q.getDependencies("scene"),Q.getDependencies("animation"),Q.getDependencies("camera")])}).then(function(K){let Y={scene:K[0][Z.scene||0],scenes:K[0],animations:K[1],cameras:K[2],asset:Z.asset,parser:Q,userData:{}};return O$(W,Y,Z),o7(Y,Z),Promise.all(Q._invokeAll(function(q){return q.afterRoot&&q.afterRoot(Y)})).then(function(){for(let q of Y.scenes)q.updateMatrixWorld();$(Y)})}).catch(J)}_markDefs(){let $=this.json.nodes||[],J=this.json.skins||[],Q=this.json.meshes||[];for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z].joints;for(let Y=0,q=K.length;Y<q;Y++)$[K[Y]].isBone=!0}for(let Z=0,W=$.length;Z<W;Z++){let K=$[Z];if(K.mesh!==void 0){if(this._addNodeRef(this.meshCache,K.mesh),K.skin!==void 0)Q[K.mesh].isSkinnedMesh=!0}if(K.camera!==void 0)this._addNodeRef(this.cameraCache,K.camera)}}_addNodeRef($,J){if(J===void 0)return;if($.refs[J]===void 0)$.refs[J]=$.uses[J]=0;$.refs[J]++}_getNodeRef($,J,Q){if($.refs[J]<=1)return Q;let Z=Q.clone(),W=(K,Y)=>{let q=this.associations.get(K);if(q!=null)this.associations.set(Y,q);for(let[G,V]of K.children.entries())W(V,Y.children[G])};return W(Q,Z),Z.name+="_instance_"+$.uses[J]++,Z}_invokeOne($){let J=Object.values(this.plugins);J.push(this);for(let Q=0;Q<J.length;Q++){let Z=$(J[Q]);if(Z)return Z}return null}_invokeAll($){let J=Object.values(this.plugins);J.unshift(this);let Q=[];for(let Z=0;Z<J.length;Z++){let W=$(J[Z]);if(W)Q.push(W)}return Q}getDependency($,J){let Q=$+":"+J,Z=this.cache.get(Q);if(!Z){switch($){case"scene":Z=this.loadScene(J);break;case"node":Z=this._invokeOne(function(W){return W.loadNode&&W.loadNode(J)});break;case"mesh":Z=this._invokeOne(function(W){return W.loadMesh&&W.loadMesh(J)});break;case"accessor":Z=this.loadAccessor(J);break;case"bufferView":Z=this._invokeOne(function(W){return W.loadBufferView&&W.loadBufferView(J)});break;case"buffer":Z=this.loadBuffer(J);break;case"material":Z=this._invokeOne(function(W){return W.loadMaterial&&W.loadMaterial(J)});break;case"texture":Z=this._invokeOne(function(W){return W.loadTexture&&W.loadTexture(J)});break;case"skin":Z=this.loadSkin(J);break;case"animation":Z=this._invokeOne(function(W){return W.loadAnimation&&W.loadAnimation(J)});break;case"camera":Z=this.loadCamera(J);break;default:if(Z=this._invokeOne(function(W){return W!=this&&W.getDependency&&W.getDependency($,J)}),!Z)throw Error("Unknown type: "+$);break}this.cache.add(Q,Z)}return Z}getDependencies($){let J=this.cache.get($);if(!J){let Q=this,Z=this.json[$+($==="mesh"?"es":"s")]||[];J=Promise.all(Z.map(function(W,K){return Q.getDependency($,K)})),this.cache.add($,J)}return J}loadBuffer($){let J=this.json.buffers[$],Q=this.fileLoader;if(J.type&&J.type!=="arraybuffer")throw Error("THREE.GLTFLoader: "+J.type+" buffer type is not supported.");if(J.uri===void 0&&$===0)return Promise.resolve(this.extensions[N6.KHR_BINARY_GLTF].body);let Z=this.options;return new Promise(function(W,K){Q.load(B$.resolveURL(J.uri,Z.path),W,void 0,function(){K(Error('THREE.GLTFLoader: Failed to load buffer "'+J.uri+'".'))})})}loadBufferView($){let J=this.json.bufferViews[$];return this.getDependency("buffer",J.buffer).then(function(Q){let Z=J.byteLength||0,W=J.byteOffset||0;return Q.slice(W,W+Z)})}loadAccessor($){let J=this,Q=this.json,Z=this.json.accessors[$];if(Z.bufferView===void 0&&Z.sparse===void 0){let K=xZ[Z.type],Y=H5[Z.componentType],q=Z.normalized===!0,G=new Y(Z.count*K);return Promise.resolve(new B8(G,K,q))}let W=[];if(Z.bufferView!==void 0)W.push(this.getDependency("bufferView",Z.bufferView));else W.push(null);if(Z.sparse!==void 0)W.push(this.getDependency("bufferView",Z.sparse.indices.bufferView)),W.push(this.getDependency("bufferView",Z.sparse.values.bufferView));return Promise.all(W).then(function(K){let Y=K[0],q=xZ[Z.type],G=H5[Z.componentType],V=G.BYTES_PER_ELEMENT,H=V*q,N=Z.byteOffset||0,O=Z.bufferView!==void 0?Q.bufferViews[Z.bufferView].byteStride:void 0,P=Z.normalized===!0,D,C;if(O&&O!==H){let z=Math.floor(N/O),L="InterleavedBuffer:"+Z.bufferView+":"+Z.componentType+":"+z+":"+Z.count,T=J.cache.get(L);if(!T)D=new G(Y,z*O,Z.count*O/V),T=new mJ(D,O/V),J.cache.add(L,T);C=new dJ(T,q,N%O/V,P)}else{if(Y===null)D=new G(Z.count*q);else D=new G(Y,N,Z.count*q);C=new B8(D,q,P)}if(Z.sparse!==void 0){let z=xZ.SCALAR,L=H5[Z.sparse.indices.componentType],T=Z.sparse.indices.byteOffset||0,R=Z.sparse.values.byteOffset||0,v=new L(K[1],T,Z.sparse.count*z),g=new G(K[2],R,Z.sparse.count*q);if(Y!==null)C=new B8(C.array.slice(),C.itemSize,C.normalized);C.normalized=!1;for(let y=0,M=v.length;y<M;y++){let p=v[y];if(C.setX(p,g[y*q]),q>=2)C.setY(p,g[y*q+1]);if(q>=3)C.setZ(p,g[y*q+2]);if(q>=4)C.setW(p,g[y*q+3]);if(q>=5)throw Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}C.normalized=P}return C})}loadTexture($){let J=this.json,Q=this.options,W=J.textures[$].source,K=J.images[W],Y=this.textureLoader;if(K.uri){let q=Q.manager.getHandler(K.uri);if(q!==null)Y=q}return this.loadTextureImage($,W,Y)}loadTextureImage($,J,Q){let Z=this,W=this.json,K=W.textures[$],Y=W.images[J],q=(Y.uri||Y.bufferView)+":"+K.sampler;if(this.textureCache[q])return this.textureCache[q];let G=this.loadImageSource(J,Q).then(function(V){if(V.flipY=!1,V.name=K.name||Y.name||"",V.name===""&&typeof Y.uri==="string"&&Y.uri.startsWith("data:image/")===!1)V.name=Y.uri;let N=(W.samplers||{})[K.sampler]||{};return V.magFilter=G3[N.magFilter]||s6,V.minFilter=G3[N.minFilter]||nJ,V.wrapS=V3[N.wrapS]||X9,V.wrapT=V3[N.wrapT]||X9,V.generateMipmaps=!V.isCompressedTexture&&V.minFilter!==N$&&V.minFilter!==s6,Z.associations.set(V,{textures:$}),V}).catch(function(){return null});return this.textureCache[q]=G,G}loadImageSource($,J){let Q=this,Z=this.json,W=this.options;if(this.sourceCache[$]!==void 0)return this.sourceCache[$].then((H)=>H.clone());let K=Z.images[$],Y=self.URL||self.webkitURL,q=K.uri||"",G=!1;if(K.bufferView!==void 0)q=Q.getDependency("bufferView",K.bufferView).then(function(H){G=!0;let N=new Blob([H],{type:K.mimeType});return q=Y.createObjectURL(N),q});else if(K.uri===void 0)throw Error("THREE.GLTFLoader: Image "+$+" is missing URI and bufferView");let V=Promise.resolve(q).then(function(H){return new Promise(function(N,O){let P=N;if(J.isImageBitmapLoader===!0)P=function(D){let C=new JQ(D);C.needsUpdate=!0,N(C)};J.load(B$.resolveURL(H,W.path),P,void 0,O)})}).then(function(H){if(G===!0)Y.revokeObjectURL(q);return o7(H,K),H.userData.mimeType=K.mimeType||lH(K.uri),H}).catch(function(H){throw console.error("THREE.GLTFLoader: Couldn't load texture",q),H});return this.sourceCache[$]=V,V}assignTexture($,J,Q,Z){let W=this;return this.getDependency("texture",Q.index).then(function(K){if(!K)return null;if(Q.texCoord!==void 0&&Q.texCoord>0)K=K.clone(),K.channel=Q.texCoord;if(W.extensions[N6.KHR_TEXTURE_TRANSFORM]){let Y=Q.extensions!==void 0?Q.extensions[N6.KHR_TEXTURE_TRANSFORM]:void 0;if(Y){let q=W.associations.get(K);K=W.extensions[N6.KHR_TEXTURE_TRANSFORM].extendTexture(K,Y),W.associations.set(K,q)}}if(Z!==void 0)K.colorSpace=Z;return $[J]=K,K})}assignFinalMaterial($){let{geometry:J,material:Q}=$,Z=J.attributes.tangent===void 0,W=J.attributes.color!==void 0,K=J.attributes.normal===void 0;if($.isPoints){let Y="PointsMaterial:"+Q.uuid,q=this.cache.get(Y);if(!q)q=new SZ,Q9.prototype.copy.call(q,Q),q.color.copy(Q.color),q.map=Q.map,q.sizeAttenuation=!1,this.cache.add(Y,q);Q=q}else if($.isLine){let Y="LineBasicMaterial:"+Q.uuid,q=this.cache.get(Y);if(!q)q=new BZ,Q9.prototype.copy.call(q,Q),q.color.copy(Q.color),q.map=Q.map,this.cache.add(Y,q);Q=q}if(Z||W||K){let Y="ClonedMaterial:"+Q.uuid+":";if(Z)Y+="derivative-tangents:";if(W)Y+="vertex-colors:";if(K)Y+="flat-shading:";let q=this.cache.get(Y);if(!q){if(q=Q.clone(),W)q.vertexColors=!0;if(K)q.flatShading=!0;if(Z){if(q.normalScale)q.normalScale.y*=-1;if(q.clearcoatNormalScale)q.clearcoatNormalScale.y*=-1}this.cache.add(Y,q),this.associations.set(q,this.associations.get(Q))}Q=q}$.material=Q}getMaterialType(){return L8}loadMaterial($){let J=this,Q=this.json,Z=this.extensions,W=Q.materials[$],K,Y={},q=W.extensions||{},G=[];if(q[N6.KHR_MATERIALS_UNLIT]){let H=Z[N6.KHR_MATERIALS_UNLIT];K=H.getMaterialType(),G.push(H.extendParams(Y,W,J))}else{let H=W.pbrMetallicRoughness||{};if(Y.color=new P7(1,1,1),Y.opacity=1,Array.isArray(H.baseColorFactor)){let N=H.baseColorFactor;Y.color.setRGB(N[0],N[1],N[2],Y7),Y.opacity=N[3]}if(H.baseColorTexture!==void 0)G.push(J.assignTexture(Y,"map",H.baseColorTexture,s7));if(Y.metalness=H.metallicFactor!==void 0?H.metallicFactor:1,Y.roughness=H.roughnessFactor!==void 0?H.roughnessFactor:1,H.metallicRoughnessTexture!==void 0)G.push(J.assignTexture(Y,"metalnessMap",H.metallicRoughnessTexture)),G.push(J.assignTexture(Y,"roughnessMap",H.metallicRoughnessTexture));K=this._invokeOne(function(N){return N.getMaterialType&&N.getMaterialType($)}),G.push(Promise.all(this._invokeAll(function(N){return N.extendMaterialParams&&N.extendMaterialParams($,Y)})))}if(W.doubleSided===!0)Y.side=WZ;let V=W.alphaMode||bZ.OPAQUE;if(V===bZ.BLEND)Y.transparent=!0,Y.depthWrite=!1;else if(Y.transparent=!1,V===bZ.MASK)Y.alphaTest=W.alphaCutoff!==void 0?W.alphaCutoff:0.5;if(W.normalTexture!==void 0&&K!==H$){if(G.push(J.assignTexture(Y,"normalMap",W.normalTexture)),Y.normalScale=new F$(1,1),W.normalTexture.scale!==void 0){let H=W.normalTexture.scale;Y.normalScale.set(H,H)}}if(W.occlusionTexture!==void 0&&K!==H$){if(G.push(J.assignTexture(Y,"aoMap",W.occlusionTexture)),W.occlusionTexture.strength!==void 0)Y.aoMapIntensity=W.occlusionTexture.strength}if(W.emissiveFactor!==void 0&&K!==H$){let H=W.emissiveFactor;Y.emissive=new P7().setRGB(H[0],H[1],H[2],Y7)}if(W.emissiveTexture!==void 0&&K!==H$)G.push(J.assignTexture(Y,"emissiveMap",W.emissiveTexture,s7));return Promise.all(G).then(function(){let H=new K(Y);if(W.name)H.name=W.name;if(o7(H,W),J.associations.set(H,{materials:$}),W.extensions)O$(Z,H,W);return H})}createUniqueName($){let J=AZ.sanitizeNodeName($||"");if(J in this.nodeNamesUsed)return J+"_"+ ++this.nodeNamesUsed[J];else return this.nodeNamesUsed[J]=0,J}loadGeometries($){let J=this,Q=this.extensions,Z=this.primitiveCache;function W(Y){return Q[N6.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(Y,J).then(function(q){return B3(q,Y,J)})}let K=[];for(let Y=0,q=$.length;Y<q;Y++){let G=$[Y],V=uH(G),H=Z[V];if(H)K.push(H.promise);else{let N;if(G.extensions&&G.extensions[N6.KHR_DRACO_MESH_COMPRESSION])N=W(G);else N=B3(new V$,G,J);Z[V]={primitive:G,promise:N},K.push(N)}}return Promise.all(K)}loadMesh($){let J=this,Q=this.json,Z=this.extensions,W=Q.meshes[$],K=W.primitives,Y=[];for(let q=0,G=K.length;q<G;q++){let V=K[q].material===void 0?fH(this.cache):this.getDependency("material",K[q].material);Y.push(V)}return Y.push(J.loadGeometries(K)),Promise.all(Y).then(function(q){let G=q.slice(0,q.length-1),V=q[q.length-1],H=[];for(let O=0,P=V.length;O<P;O++){let D=V[O],C=K[O],z,L=G[O];if(C.mode===w7.TRIANGLES||C.mode===w7.TRIANGLE_STRIP||C.mode===w7.TRIANGLE_FAN||C.mode===void 0){if(z=W.isSkinnedMesh===!0?new MZ(D,L):new O8(D,L),z.isSkinnedMesh===!0)z.normalizeSkinWeights();if(C.mode===w7.TRIANGLE_STRIP)z.geometry=hZ(z.geometry,V9);else if(C.mode===w7.TRIANGLE_FAN)z.geometry=hZ(z.geometry,G5)}else if(C.mode===w7.LINES)z=new NZ(D,L);else if(C.mode===w7.LINE_STRIP)z=new VZ(D,L);else if(C.mode===w7.LINE_LOOP)z=new HZ(D,L);else if(C.mode===w7.POINTS)z=new q9(D,L);else throw Error("THREE.GLTFLoader: Primitive mode unsupported: "+C.mode);if(Object.keys(z.geometry.morphAttributes).length>0)pH(z,W);if(z.name=J.createUniqueName(W.name||"mesh_"+$),o7(z,W),C.extensions)O$(Z,z,C);J.assignFinalMaterial(z),H.push(z)}for(let O=0,P=H.length;O<P;O++)J.associations.set(H[O],{meshes:$,primitives:O});if(H.length===1){if(W.extensions)O$(Z,H[0],W);return H[0]}let N=new h8;if(W.extensions)O$(Z,N,W);J.associations.set(N,{meshes:$});for(let O=0,P=H.length;O<P;O++)N.add(H[O]);return N})}loadCamera($){let J,Q=this.json.cameras[$],Z=Q[Q.type];if(!Z){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}if(Q.type==="perspective")J=new U9(zZ.radToDeg(Z.yfov),Z.aspectRatio||1,Z.znear||1,Z.zfar||2000000);else if(Q.type==="orthographic")J=new K9(-Z.xmag,Z.xmag,Z.ymag,-Z.ymag,Z.znear,Z.zfar);if(Q.name)J.name=this.createUniqueName(Q.name);return o7(J,Q),Promise.resolve(J)}loadSkin($){let J=this.json.skins[$],Q=[];for(let Z=0,W=J.joints.length;Z<W;Z++)Q.push(this._loadNodeShallow(J.joints[Z]));if(J.inverseBindMatrices!==void 0)Q.push(this.getDependency("accessor",J.inverseBindMatrices));else Q.push(null);return Promise.all(Q).then(function(Z){let W=Z.pop(),K=Z,Y=[],q=[];for(let G=0,V=K.length;G<V;G++){let H=K[G];if(H){Y.push(H);let N=new F8;if(W!==null)N.fromArray(W.array,G*16);q.push(N)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',J.joints[G])}return new jZ(Y,q)})}loadAnimation($){let J=this.json,Q=this,Z=J.animations[$],W=Z.name?Z.name:"animation_"+$,K=[],Y=[],q=[],G=[],V=[];for(let H=0,N=Z.channels.length;H<N;H++){let O=Z.channels[H],P=Z.samplers[O.sampler],D=O.target,C=D.node,z=Z.parameters!==void 0?Z.parameters[P.input]:P.input,L=Z.parameters!==void 0?Z.parameters[P.output]:P.output;if(D.node===void 0)continue;K.push(this.getDependency("node",C)),Y.push(this.getDependency("accessor",z)),q.push(this.getDependency("accessor",L)),G.push(P),V.push(D)}return Promise.all([Promise.all(K),Promise.all(Y),Promise.all(q),Promise.all(G),Promise.all(V)]).then(function(H){let N=H[0],O=H[1],P=H[2],D=H[3],C=H[4],z=[];for(let T=0,R=N.length;T<R;T++){let v=N[T],g=O[T],y=P[T],M=D[T],p=C[T];if(v===void 0)continue;if(v.updateMatrix)v.updateMatrix();let A=Q._createAnimationTracks(v,g,y,M,p);if(A)for(let j=0;j<A.length;j++)z.push(A[j])}let L=new r5(W,void 0,z);return o7(L,Z),L})}createNodeMesh($){let J=this.json,Q=this,Z=J.nodes[$];if(Z.mesh===void 0)return null;return Q.getDependency("mesh",Z.mesh).then(function(W){let K=Q._getNodeRef(Q.meshCache,Z.mesh,W);if(Z.weights!==void 0)K.traverse(function(Y){if(!Y.isMesh)return;for(let q=0,G=Z.weights.length;q<G;q++)Y.morphTargetInfluences[q]=Z.weights[q]});return K})}loadNode($){let J=this.json,Q=this,Z=J.nodes[$],W=Q._loadNodeShallow($),K=[],Y=Z.children||[];for(let G=0,V=Y.length;G<V;G++)K.push(Q.getDependency("node",Y[G]));let q=Z.skin===void 0?Promise.resolve(null):Q.getDependency("skin",Z.skin);return Promise.all([W,Promise.all(K),q]).then(function(G){let V=G[0],H=G[1],N=G[2];if(N!==null)V.traverse(function(O){if(!O.isSkinnedMesh)return;O.bind(N,mH)});for(let O=0,P=H.length;O<P;O++)V.add(H[O]);return V})}_loadNodeShallow($){let J=this.json,Q=this.extensions,Z=this;if(this.nodeCache[$]!==void 0)return this.nodeCache[$];let W=J.nodes[$],K=W.name?Z.createUniqueName(W.name):"",Y=[],q=Z._invokeOne(function(G){return G.createNodeMesh&&G.createNodeMesh($)});if(q)Y.push(q);if(W.camera!==void 0)Y.push(Z.getDependency("camera",W.camera).then(function(G){return Z._getNodeRef(Z.cameraCache,W.camera,G)}));return Z._invokeAll(function(G){return G.createNodeAttachment&&G.createNodeAttachment($)}).forEach(function(G){Y.push(G)}),this.nodeCache[$]=Promise.all(Y).then(function(G){let V;if(W.isBone===!0)V=new e1;else if(G.length>1)V=new h8;else if(G.length===1)V=G[0];else V=new oJ;if(V!==G[0])for(let H=0,N=G.length;H<N;H++)V.add(G[H]);if(W.name)V.userData.name=W.name,V.name=K;if(o7(V,W),W.extensions)O$(Q,V,W);if(W.matrix!==void 0){let H=new F8;H.fromArray(W.matrix),V.applyMatrix4(H)}else{if(W.translation!==void 0)V.position.fromArray(W.translation);if(W.rotation!==void 0)V.quaternion.fromArray(W.rotation);if(W.scale!==void 0)V.scale.fromArray(W.scale)}if(!Z.associations.has(V))Z.associations.set(V,{});else if(W.mesh!==void 0&&Z.meshCache.refs[W.mesh]>1){let H=Z.associations.get(V);Z.associations.set(V,{...H})}return Z.associations.get(V).nodes=$,V}),this.nodeCache[$]}loadScene($){let J=this.extensions,Q=this.json.scenes[$],Z=this,W=new h8;if(Q.name)W.name=Z.createUniqueName(Q.name);if(o7(W,Q),Q.extensions)O$(J,W,Q);let K=Q.nodes||[],Y=[];for(let q=0,G=K.length;q<G;q++)Y.push(Z.getDependency("node",K[q]));return Promise.all(Y).then(function(q){for(let V=0,H=q.length;V<H;V++)W.add(q[V]);let G=(V)=>{let H=new Map;for(let[N,O]of Z.associations)if(N instanceof Q9||N instanceof JQ)H.set(N,O);return V.traverse((N)=>{let O=Z.associations.get(N);if(O!=null)H.set(N,O)}),H};return Z.associations=G(W),W})}_createAnimationTracks($,J,Q,Z,W){let K=[],Y=$.name?$.name:$.uuid,q=[];if(b8[W.path]===b8.weights)$.traverse(function(N){if(N.morphTargetInfluences)q.push(N.name?N.name:N.uuid)});else q.push(Y);let G;switch(b8[W.path]){case b8.weights:G=sJ;break;case b8.rotation:G=q5;break;case b8.translation:case b8.scale:G=V5;break;default:switch(Q.itemSize){case 1:G=sJ;break;case 2:case 3:default:G=V5;break}break}let V=Z.interpolation!==void 0?bH[Z.interpolation]:cJ,H=this._getArrayFromAccessor(Q);for(let N=0,O=q.length;N<O;N++){let P=new G(q[N]+"."+b8[W.path],J.array,H,V);if(Z.interpolation==="CUBICSPLINE")this._createCubicSplineTrackInterpolant(P);K.push(P)}return K}_getArrayFromAccessor($){let J=$.array;if($.normalized){let Q=pZ(J.constructor),Z=new Float32Array(J.length);for(let W=0,K=J.length;W<K;W++)Z[W]=J[W]*Q;J=Z}return J}_createCubicSplineTrackInterpolant($){$.createInterpolant=function(Q){return new(this instanceof q5?b3:uZ)(this.times,this.values,this.getValueSize()/3,Q)},$.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function dH($,J,Q){let Z=J.attributes,W=new $Z;if(Z.POSITION!==void 0){let q=Q.json.accessors[Z.POSITION],G=q.min,V=q.max;if(G!==void 0&&V!==void 0){if(W.set(new l6(G[0],G[1],G[2]),new l6(V[0],V[1],V[2])),q.normalized){let H=pZ(H5[q.componentType]);W.min.multiplyScalar(H),W.max.multiplyScalar(H)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let K=J.targets;if(K!==void 0){let q=new l6,G=new l6;for(let V=0,H=K.length;V<H;V++){let N=K[V];if(N.POSITION!==void 0){let O=Q.json.accessors[N.POSITION],P=O.min,D=O.max;if(P!==void 0&&D!==void 0){if(G.setX(Math.max(Math.abs(P[0]),Math.abs(D[0]))),G.setY(Math.max(Math.abs(P[1]),Math.abs(D[1]))),G.setZ(Math.max(Math.abs(P[2]),Math.abs(D[2]))),O.normalized){let C=pZ(H5[O.componentType]);G.multiplyScalar(C)}q.max(G)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}W.expandByVector(q)}$.boundingBox=W;let Y=new G9;W.getCenter(Y.center),Y.radius=W.min.distanceTo(W.max)/2,$.boundingSphere=Y}function B3($,J,Q){let Z=J.attributes,W=[];function K(Y,q){return Q.getDependency("accessor",Y).then(function(G){$.setAttribute(q,G)})}for(let Y in Z){let q=gZ[Y]||Y.toLowerCase();if(q in $.attributes)continue;W.push(K(Z[Y],q))}if(J.indices!==void 0&&!$.index){let Y=Q.getDependency("accessor",J.indices).then(function(q){$.setIndex(q)});W.push(Y)}if(bJ.workingColorSpace!==Y7&&"COLOR_0"in Z)console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${bJ.workingColorSpace}" not supported.`);return o7($,J),dH($,J,Q),Promise.all(W).then(function(){return J.targets!==void 0?gH($,J.targets,Q):$})}var H3,N6,v3="glTF",B9=12,X3,uZ,xH,b3,w7,H5,G3,V3,xZ,gZ,b8,bH,bZ,mH;var p3=_5(()=>{B5();q3();H3=class H3 extends OZ{constructor($){super($);this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(J){return new L3(J)}),this.register(function(J){return new P3(J)}),this.register(function(J){return new j3(J)}),this.register(function(J){return new w3(J)}),this.register(function(J){return new M3(J)}),this.register(function(J){return new I3(J)}),this.register(function(J){return new D3(J)}),this.register(function(J){return new C3(J)}),this.register(function(J){return new R3(J)}),this.register(function(J){return new O3(J)}),this.register(function(J){return new E3(J)}),this.register(function(J){return new z3(J)}),this.register(function(J){return new A3(J)}),this.register(function(J){return new S3(J)}),this.register(function(J){return new N3(J)}),this.register(function(J){return new T3(J)}),this.register(function(J){return new k3(J)})}load($,J,Q,Z){let W=this,K;if(this.resourcePath!=="")K=this.resourcePath;else if(this.path!==""){let G=B$.extractUrlBase($);K=B$.resolveURL(G,this.path)}else K=B$.extractUrlBase($);this.manager.itemStart($);let Y=function(G){if(Z)Z(G);else console.error(G);W.manager.itemError($),W.manager.itemEnd($)},q=new pJ(this.manager);q.setPath(this.path),q.setResponseType("arraybuffer"),q.setRequestHeader(this.requestHeader),q.setWithCredentials(this.withCredentials),q.load($,function(G){try{W.parse(G,K,function(V){J(V),W.manager.itemEnd($)},Y)}catch(V){Y(V)}},Q,Y)}setDRACOLoader($){return this.dracoLoader=$,this}setKTX2Loader($){return this.ktx2Loader=$,this}setMeshoptDecoder($){return this.meshoptDecoder=$,this}register($){if(this.pluginCallbacks.indexOf($)===-1)this.pluginCallbacks.push($);return this}unregister($){if(this.pluginCallbacks.indexOf($)!==-1)this.pluginCallbacks.splice(this.pluginCallbacks.indexOf($),1);return this}parse($,J,Q,Z){let W,K={},Y={},q=new TextDecoder;if(typeof $==="string")W=JSON.parse($);else if($ instanceof ArrayBuffer)if(q.decode(new Uint8Array($,0,4))===v3){try{K[N6.KHR_BINARY_GLTF]=new _3($)}catch(H){if(Z)Z(H);return}W=JSON.parse(K[N6.KHR_BINARY_GLTF].content)}else W=JSON.parse(q.decode($));else W=$;if(W.asset===void 0||W.asset.version[0]<2){if(Z)Z(Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let G=new f3(W,{path:J||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});G.fileLoader.setRequestHeader(this.requestHeader);for(let V=0;V<this.pluginCallbacks.length;V++){let H=this.pluginCallbacks[V](G);if(!H.name)console.error("THREE.GLTFLoader: Invalid plugin found: missing name");Y[H.name]=H,K[H.name]=!0}if(W.extensionsUsed)for(let V=0;V<W.extensionsUsed.length;++V){let H=W.extensionsUsed[V],N=W.extensionsRequired||[];switch(H){case N6.KHR_MATERIALS_UNLIT:K[H]=new F3;break;case N6.KHR_DRACO_MESH_COMPRESSION:K[H]=new y3(W,this.dracoLoader);break;case N6.KHR_TEXTURE_TRANSFORM:K[H]=new h3;break;case N6.KHR_MESH_QUANTIZATION:K[H]=new x3;break;default:if(N.indexOf(H)>=0&&Y[H]===void 0)console.warn('THREE.GLTFLoader: Unknown extension "'+H+'".')}}G.setExtensions(K),G.setPlugins(Y),G.parse(Q,Z)}parseAsync($,J){let Q=this;return new Promise(function(Z,W){Q.parse($,J,Z,W)})}};N6={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};X3={JSON:1313821514,BIN:5130562};uZ=class uZ extends XZ{constructor($,J,Q,Z){super($,J,Q,Z)}copySampleValue_($){let J=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,W=$*Z*3+Z;for(let K=0;K!==Z;K++)J[K]=Q[W+K];return J}interpolate_($,J,Q,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,q=Y*2,G=Y*3,V=Z-J,H=(Q-J)/V,N=H*H,O=N*H,P=$*G,D=P-G,C=-2*O+3*N,z=O-N,L=1-C,T=z-N+H;for(let R=0;R!==Y;R++){let v=K[D+R+Y],g=K[D+R+q]*V,y=K[P+R+Y],M=K[P+R]*V;W[R]=L*v+T*g+C*y+z*M}return W}};xH=new x8;b3=class b3 extends uZ{interpolate_($,J,Q,Z){let W=super.interpolate_($,J,Q,Z);return xH.fromArray(W).normalize().toArray(W),W}};w7={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},H5={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},G3={9728:N$,9729:s6,9984:CZ,9985:FZ,9986:DZ,9987:nJ},V3={33071:H8,33648:IZ,10497:X9},xZ={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},gZ={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},b8={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},bH={CUBICSPLINE:void 0,LINEAR:cJ,STEP:GZ},bZ={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};mH=new F8});var d3={};pQ(d3,{retargetClip:()=>cH,retarget:()=>u3,clone:()=>nH});function lZ($,J){if(J.getBoneName!==void 0)return J.getBoneName($);return J.names[$.name]}function u3($,J,Q={}){let Z=new x8,W=new l6,K=new F8,Y=new F8;Q.preserveBoneMatrix=Q.preserveBoneMatrix!==void 0?Q.preserveBoneMatrix:!0,Q.preserveBonePositions=Q.preserveBonePositions!==void 0?Q.preserveBonePositions:!0,Q.useTargetMatrix=Q.useTargetMatrix!==void 0?Q.useTargetMatrix:!1,Q.hip=Q.hip!==void 0?Q.hip:"hip",Q.hipInfluence=Q.hipInfluence!==void 0?Q.hipInfluence:new l6(1,1,1),Q.scale=Q.scale!==void 0?Q.scale:1,Q.names=Q.names||{};let q=J.isObject3D?J.skeleton.bones:ZQ(J),G=$.isObject3D?$.skeleton.bones:ZQ($),V,H,N,O;if($.isObject3D)$.skeleton.pose();else Q.useTargetMatrix=!0,Q.preserveBoneMatrix=!1;if(Q.preserveBonePositions){O=[];for(let P=0;P<G.length;P++)O.push(G[P].position.clone())}if(Q.preserveBoneMatrix){$.updateMatrixWorld(),$.matrixWorld.identity();for(let P=0;P<$.children.length;++P)$.children[P].updateMatrixWorld(!0)}for(let P=0;P<G.length;++P){if(V=G[P],H=lZ(V,Q),N=l3(H,q),Y.copy(V.matrixWorld),N){if(N.updateMatrixWorld(),Q.useTargetMatrix)K.copy(N.matrixWorld);else K.copy($.matrixWorld).invert(),K.multiply(N.matrixWorld);if(W.setFromMatrixScale(K),K.scale(W.set(1/W.x,1/W.y,1/W.z)),Y.makeRotationFromQuaternion(Z.setFromRotationMatrix(K)),$.isObject3D){if(Q.localOffsets){if(Q.localOffsets[V.name])Y.multiply(Q.localOffsets[V.name])}}Y.copyPosition(K)}if(H===Q.hip){if(Y.elements[12]*=Q.scale*Q.hipInfluence.x,Y.elements[13]*=Q.scale*Q.hipInfluence.y,Y.elements[14]*=Q.scale*Q.hipInfluence.z,Q.hipPosition!==void 0)Y.elements[12]+=Q.hipPosition.x*Q.scale,Y.elements[13]+=Q.hipPosition.y*Q.scale,Y.elements[14]+=Q.hipPosition.z*Q.scale}if(V.parent)V.matrix.copy(V.parent.matrixWorld).invert(),V.matrix.multiply(Y);else V.matrix.copy(Y);V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld()}if(Q.preserveBonePositions){for(let P=0;P<G.length;++P)if(V=G[P],H=lZ(V,Q)||V.name,H!==Q.hip)V.position.copy(O[P])}if(Q.preserveBoneMatrix)$.updateMatrixWorld(!0)}function cH($,J,Q,Z={}){if(Z.useFirstFramePosition=Z.useFirstFramePosition!==void 0?Z.useFirstFramePosition:!1,Z.fps=Z.fps!==void 0?Z.fps:Math.max(...Q.tracks.map((L)=>L.times.length))/Q.duration,Z.names=Z.names||[],!J.isObject3D)J=iH(J);let W=Math.round(Q.duration*(Z.fps/1000)*1000),K=Q.duration/(W-1),Y=[],q=new Z5(J),G=ZQ($.skeleton),V=[],H,N,O,P,D;q.clipAction(Q).play();let C=0,z=W;if(Z.trim!==void 0)C=Math.round(Z.trim[0]*Z.fps),z=Math.min(Math.round(Z.trim[1]*Z.fps),W)-C,q.update(Z.trim[0]);else q.update(0);J.updateMatrixWorld();for(let L=0;L<z;++L){let T=L*K;u3($,J,Z);for(let R=0;R<G.length;++R)if(N=G[R],D=lZ(N,Z)||N.name,O=l3(D,J.skeleton),O){if(P=V[R]=V[R]||{bone:N},Z.hip===D){if(!P.pos)P.pos={times:new Float32Array(z),values:new Float32Array(z*3)};if(Z.useFirstFramePosition){if(L===0)H=N.position.clone();N.position.sub(H)}P.pos.times[L]=T,N.position.toArray(P.pos.values,L*3)}if(!P.quat)P.quat={times:new Float32Array(z),values:new Float32Array(z*4)};P.quat.times[L]=T,N.quaternion.toArray(P.quat.values,L*4)}if(L===z-2)q.update(K-0.0000001);else q.update(K);J.updateMatrixWorld()}for(let L=0;L<V.length;++L)if(P=V[L],P){if(P.pos)Y.push(new V5(".bones["+P.bone.name+"].position",P.pos.times,P.pos.values));Y.push(new q5(".bones["+P.bone.name+"].quaternion",P.quat.times,P.quat.values))}return q.uncacheAction(Q),new r5(Q.name,-1,Y)}function nH($){let J=new Map,Q=new Map,Z=$.clone();return m3($,Z,function(W,K){J.set(K,W),Q.set(W,K)}),Z.traverse(function(W){if(!W.isSkinnedMesh)return;let K=W,Y=J.get(W),q=Y.skeleton.bones;K.skeleton=Y.skeleton.clone(),K.bindMatrix.copy(Y.bindMatrix),K.skeleton.bones=q.map(function(G){return Q.get(G)}),K.bind(K.skeleton,K.bindMatrix)}),Z}function l3($,J){for(let Q=0,Z=ZQ(J);Q<Z.length;Q++)if($===Z[Q].name)return Z[Q]}function ZQ($){return Array.isArray($)?$:$.bones}function iH($){let J=new wZ($.bones[0]);return J.skeleton=$,J}function m3($,J,Q){Q($,J);for(let Z=0;Z<$.children.length;Z++)m3($.children[Z],J.children[Z],Q)}var c3=_5(()=>{B5()});var i3={};pQ(i3,{HDRLoader:()=>n3});var n3;var s3=_5(()=>{B5();n3=class n3 extends ZZ{constructor($){super($);this.type=N8}parse($){let K=function(M,p){switch(M){case 1:throw Error("THREE.HDRLoader: Read Error: "+(p||""));case 2:throw Error("THREE.HDRLoader: Write Error: "+(p||""));case 3:throw Error("THREE.HDRLoader: Bad File Format: "+(p||""));default:case 4:throw Error("THREE.HDRLoader: Memory Error: "+(p||""))}},H=function(M,p,A){p=!p?1024:p;let h=M.pos,l=-1,m=0,n="",o=String.fromCharCode.apply(null,new Uint16Array(M.subarray(h,h+128)));while(0>(l=o.indexOf(`
`))&&m<p&&h<M.byteLength)n+=o,m+=o.length,h+=128,o+=String.fromCharCode.apply(null,new Uint16Array(M.subarray(h,h+128)));if(-1<l){if(A!==!1)M.pos+=m+l+1;return n+o.slice(0,l)}return!1},N=function(M){let p=/^#\?(\S+)/,A=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,j=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,h=/^\s*FORMAT=(\S+)\s*$/,l=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,m={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},n,o;if(M.pos>=M.byteLength||!(n=H(M)))K(1,"no header found");if(!(o=n.match(p)))K(3,"bad initial token");m.valid|=1,m.programtype=o[1],m.string+=n+`
`;while(!0){if(n=H(M),n===!1)break;if(m.string+=n+`
`,n.charAt(0)==="#"){m.comments+=n+`
`;continue}if(o=n.match(A))m.gamma=parseFloat(o[1]);if(o=n.match(j))m.exposure=parseFloat(o[1]);if(o=n.match(h))m.valid|=2,m.format=o[1];if(o=n.match(l))m.valid|=4,m.height=parseInt(o[1],10),m.width=parseInt(o[2],10);if(m.valid&2&&m.valid&4)break}if(!(m.valid&2))K(3,"missing format specifier");if(!(m.valid&4))K(3,"missing image size specifier");return m},O=function(M,p,A){let j=p;if(j<8||j>32767||(M[0]!==2||M[1]!==2||M[2]&128))return new Uint8Array(M);if(j!==(M[2]<<8|M[3]))K(3,"wrong scanline width");let h=new Uint8Array(4*p*A);if(!h.length)K(4,"unable to allocate buffer space");let l=0,m=0,n=4*j,o=new Uint8Array(4),$0=new Uint8Array(n),F0=A;while(F0>0&&m<M.byteLength){if(m+4>M.byteLength)K(1);if(o[0]=M[m++],o[1]=M[m++],o[2]=M[m++],o[3]=M[m++],o[0]!=2||o[1]!=2||(o[2]<<8|o[3])!=j)K(3,"bad rgbe scanline format");let J0=0,I0;while(J0<n&&m<M.byteLength){I0=M[m++];let u0=I0>128;if(u0)I0-=128;if(I0===0||J0+I0>n)K(3,"bad scanline data");if(u0){let t0=M[m++];for(let O6=0;O6<I0;O6++)$0[J0++]=t0}else $0.set(M.subarray(m,m+I0),J0),J0+=I0,m+=I0}let y0=j;for(let u0=0;u0<y0;u0++){let t0=0;h[l]=$0[u0+t0],t0+=j,h[l+1]=$0[u0+t0],t0+=j,h[l+2]=$0[u0+t0],t0+=j,h[l+3]=$0[u0+t0],l+=4}F0--}return h},P=function(M,p,A,j){let h=M[p+3],l=Math.pow(2,h-128)/255;A[j+0]=M[p+0]*l,A[j+1]=M[p+1]*l,A[j+2]=M[p+2]*l,A[j+3]=1},D=function(M,p,A,j){let h=M[p+3],l=Math.pow(2,h-128)/255;A[j+0]=K5.toHalfFloat(Math.min(M[p+0]*l,65504)),A[j+1]=K5.toHalfFloat(Math.min(M[p+1]*l,65504)),A[j+2]=K5.toHalfFloat(Math.min(M[p+2]*l,65504)),A[j+3]=K5.toHalfFloat(1)},C=new Uint8Array($);C.pos=0;let z=N(C),L=z.width,T=z.height,R=O(C.subarray(C.pos),L,T),v,g,y;switch(this.type){case $9:y=R.length/4;let M=new Float32Array(y*4);for(let A=0;A<y;A++)P(R,A*4,M,A*4);v=M,g=$9;break;case N8:y=R.length/4;let p=new Uint16Array(y*4);for(let A=0;A<y;A++)D(R,A*4,p,A*4);v=p,g=N8;break;default:throw Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:L,height:T,data:v,header:z.string,gamma:z.gamma,exposure:z.exposure,type:g}}setDataType($){return this.type=$,this}load($,J,Q,Z){function W(K,Y){switch(K.type){case $9:case N8:K.colorSpace=Y7,K.minFilter=s6,K.magFilter=s6,K.generateMipmaps=!1,K.flipY=!0;break}if(J)J(K,Y)}return super.load($,W,Q,Z)}}});B5();(function(){let $=function(H){let N=H.clock??{requestFrame:(l)=>requestAnimationFrame(l),cancelFrame:(l)=>cancelAnimationFrame(l)},O=H.timers??{setTimeout:(l,m)=>setTimeout(l,m),clearTimeout:(l)=>clearTimeout(l),setInterval:(l,m)=>setInterval(l,m),clearInterval:(l)=>clearInterval(l)},P=new AbortController,D=new Set,C=new Set,z=new Set,L=new Set,T=[],R=null,v=null,g=!1,y=!1,M=!1,p=(l)=>{if(M)return;return H.runCallback?H.runCallback(l):l()},A=()=>{if(M||y||g||R!==null||D.size===0)return;R=N.requestFrame(j)},j=(l)=>{if(R=null,M||y||g)return;let m=v===null?0:Math.max(0,(l-v)/1000);v=l;for(let n of[...D])if(p(()=>n(m)),M)break;A()},h={onFrame(l){if(M||y)return()=>{return};return D.add(l),A(),()=>{if(D.delete(l),D.size===0&&R!==null)N.cancelFrame(R),R=null}},everyFrames(l,m){let n=Math.max(1,Math.floor(l)),o=0;return h.onFrame(()=>{if(o+=1,o<n)return;o=0,m()})},everySeconds(l,m){let n=Math.max(0.001,l),o=0;return h.onFrame(($0)=>{o+=$0;while(o>=n)o-=n,m()})},pause(){if(M||y||g)return;if(g=!0,v=null,R!==null)N.cancelFrame(R);R=null},resume(){if(M||y||!g)return;g=!1,v=null,A()},dispose(){if(y)return;if(y=!0,R!==null)N.cancelFrame(R);R=null,D.clear()}};return{signal:P.signal,scheduler:h,run:p,isControlSignal(l){return H.isControlSignal?.(l)??!1},setTimeout(l,m){if(M)return-1;let n=-1;return n=O.setTimeout(()=>{if(z.delete(n),!M)p(l)},m),z.add(n),n},setInterval(l,m){if(M)return-1;let n=O.setInterval(()=>{if(!M)p(l)},m);return L.add(n),n},requestFrame(l){if(M)return-1;let m=-1;return m=N.requestFrame((n)=>{if(C.delete(m),!M)p(()=>l(n))}),C.add(m),m},setEventHandler(l,m,n){if(M||!l)return;let o=($0)=>p(()=>n.call(l,$0));Reflect.set(l,m,o),T.push(()=>{if(Reflect.get(l,m)===o)Reflect.set(l,m,null)})},registerResource(l){if(M){l();return}T.push(l)},requestRestart(){if(!M)H.requestRestart()},dispose(){if(M)return;M=!0,h.dispose(),P.abort();for(let l of C)N.cancelFrame(l);C.clear();for(let l of z)O.clearTimeout(l);z.clear();for(let l of L)O.clearInterval(l);L.clear();for(let l of T.reverse())try{l()}catch(m){console.error("Falha ao descartar um recurso da execução do projeto.",m)}T.length=0}}},J,Q=0,Z=Object.freeze({kind:"sz-project-restart"});function W(V){return V===Z}function K(V,H,N){if(typeof V!=="function")return;let O=Q===0;Q++;try{return V.apply(H,N||[])}catch(P){if(O&&W(P))return;throw P}finally{Q--}}function Y(){if(Q>0)throw Z}function q(){if(!J)return;J.dispose(),J=void 0}function G(V){return q(),J=$({requestRestart:typeof V==="function"?V:function(){},runCallback:K,isControlSignal:W}),J}window.addEventListener("pagehide",q,{once:!0}),window.__SZProjectLifecycle=Object.freeze({begin:G,dispose:q,run:K,endCallback:Y,isControlSignal:W})})();(function(){var $={w:1280,h:720,world:80,sky:"#0b1026",skyBottom:"",ground:"#14532d",accent:"#22d3ee",pauseKey:"escape",shadows:!0,bloom:!0,bloomStrength:1.2,vignette:!0,ambient:0.55,fog:null},J=200,Q=20,Z=64,W=32,K=64,Y=8,q=16,G=2073600,V=48,H=500000,N=256,O=64,P=96,D=2000000,C=512,z=1024,L=512,T=1024,R=32,v=20,g=20000,y=10,M=32,p="menu",A=[],j=!1,h=!1,l=0,m=!1,n=!1,o={},$0={},F0=[],J0=[],I0=Object.create(null),y0=Object.create(null),u0=null,t0=!1,O6=Object.create(null),B6=[],q0=Object.create(null),S0=Object.create(null),A0=Object.create(null),l0=Object.create(null),z0=Object.create(null),e0=0,Q6=Object.create(null),x=[],D6=Object.create(null),s0=[],o0=Object.create(null),g0=Object.create(null),A6=Object.create(null),w0=Object.create(null),c0=0,X6=[],C6=null,_6=!1,_=null,E=null,u=null,W0=null,B0=null,Q0=null,M0=null,D0=Object.create(null),x0=null,a0=-500,P0="",X0=null,U0=null,H0=null,T0=null,Z6=null,f=[],j0=[],E0=[],b0=0,L0=0,Y0=0,C0={triangles:0,meshes:0,bones:0,materials:0,drawCalls:0},J6=!1,L6=null,R0={kind:"orbit",target:null,dist:25,height:4,pivot:null,pivotGen:0,targetGen:0},T6=null,z7=3,$7=0,L$=0,N5=1,H6=null,w6=null,P$=null,J7=null,f8=null,P8=16,g8=Object.create(null),F5=0,O5=[],WQ=[0,0,0,0],KQ=[0,0,0,0],UQ=typeof window<"u"&&window.__SZGAME_SOUNDS&&typeof window.__SZGAME_SOUNDS==="object"?window.__SZGAME_SOUNDS:{},w=typeof window<"u"&&window.__SZGAME_ASSETS&&typeof window.__SZGAME_ASSETS==="object"?window.__SZGAME_ASSETS:{},c=null,r=null,t=null,i=!1,O0=!1,k0=!1,p0=!1,v0=null,i0=0,r0=0,n0=!1;function N0(U){try{console.warn("SZGameKit3D: "+U)}catch(X){}}var R6={};function m0(U,X){if(R6[U])return;R6[U]=!0,N0(X)}var P6=0,E6=!1;function h0(){if(!E6)return Math.random();P6|=0,P6=P6+1831565813|0;var U=Math.imul(P6^P6>>>15,1|P6);return U=U+Math.imul(U^U>>>7,61|U)^U,((U^U>>>14)>>>0)/4294967296}function y6(U){var X=a(U,0);if(!X){E6=!1;return}E6=!0,P6=Math.floor(X)|0}function a(U,X){if(U==null||U==="")return X;var B=Number(U);return typeof B==="number"&&isFinite(B)?B:X}function K0(U,X){if(U==null)return X;return String(U)}function a7(U){var X=String(U==null?"":U).replace("#","");if(X.length===3)X=X.charAt(0)+X.charAt(0)+X.charAt(1)+X.charAt(1)+X.charAt(2)+X.charAt(2);if(X.length!==6)return null;for(var B=0;B<6;B++){var F=X.charCodeAt(B),I=F>=48&&F<=57,S=F>=97&&F<=102,k=F>=65&&F<=70;if(!I&&!S&&!k)return null}var b=parseInt(X,16);if(!isFinite(b))return null;return{r:b>>16&255,g:b>>8&255,b:b&255}}function e6(U,X){var B=a7(U);if(!B)return"rgba(34, 211, 238, "+X+")";return"rgba("+B.r+", "+B.g+", "+B.b+", "+X+")"}function p8(U,X){var B=a7(U);if(!B)return"#93c5fd";var F=Math.round(B.r+(255-B.r)*X),I=Math.round(B.g+(255-B.g)*X),S=Math.round(B.b+(255-B.b)*X);return"rgb("+F+", "+I+", "+S+")"}function k6(U){var X=String(U==null?"":U).toLowerCase();if(X==="espaco"||X==="espaço"||X==="space"||X==="barra de espaco"||X==="barra de espaço")return" ";if(X==="esc")return"escape";if(X==="seta direita"||X==="direita")return"arrowright";if(X==="seta esquerda"||X==="esquerda")return"arrowleft";if(X==="seta para cima"||X==="cima")return"arrowup";if(X==="seta para baixo"||X==="baixo")return"arrowdown";return X}function N7(){var U=e6($.accent,0.5),X=e6($.accent,0.3);return"#szg3k-stage { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; background: #05060f; overflow: hidden; font-family: var(--sz-game-ui-font); color: #eee; }#szg3k-frame { position: relative; }#szg3k-canvas { display: block; border: 4px solid #1f2337; background: "+$.sky+"; }.szg3k-hud { position: absolute; padding: 10px 14px; font-size: 20px; font-weight: bold; color: #fff; text-shadow: 0 0 12px "+U+", 0 2px 2px rgba(0,0,0,0.8); pointer-events: none; z-index: 500; white-space: pre; }.szg3k-hud-top-left { top: 0; left: 0; }.szg3k-hud-top-center { top: 0; left: 50%; transform: translateX(-50%); }.szg3k-hud-top-right { top: 0; right: 0; text-align: right; }.szg3k-hud-bottom-left { bottom: 0; left: 0; }.szg3k-hud-bottom-right { bottom: 0; right: 0; text-align: right; }.szg3k-say { position: absolute; max-width: 40%; padding: 8px 12px; border-radius: 14px; background: rgba(255,255,255,0.95); color: #0f172a; font-size: 16px; font-weight: 600; line-height: 1.3; pointer-events: none; transform: translate(-50%, -100%); box-shadow: 0 4px 14px rgba(0,0,0,0.35); white-space: pre-wrap; }.szg3k-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: rgba(2, 4, 12, 0.55); backdrop-filter: blur(10px); border: 3px solid "+$.accent+"; padding: 30px; border-radius: 15px; text-align: center; box-shadow: 0 0 30px "+X+"; z-index: 1000; display: none; max-width: 82%; }.szg3k-panel.szg3k-active { display: block; }.szg3k-panel h1, .szg3k-panel h2 { color: "+$.accent+"; margin: 0 0 20px 0; text-shadow: 0 0 20px "+U+"; }.szg3k-panel h1 { font-size: 40px; }.szg3k-panel h2 { font-size: 35px; }.szg3k-panel p { margin: 0 0 12px 0; font-size: 14px; min-height: 1em; }.szg3k-panel button { background: rgba(0, 0, 0, 0.4); color: white; border: 2px solid "+$.accent+"; padding: 12px 24px; margin: 8px; font-size: 16px; cursor: pointer; font-family: inherit; border-radius: 8px; transition: all 0.3s; box-shadow: 0 0 15px "+e6($.accent,0.2)+"; }.szg3k-panel button:hover { background: "+$.accent+"; box-shadow: 0 0 25px "+U+"; transform: translateY(-2px); }.szg3k-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }#szg3k-canvas:focus-visible { outline: none; box-shadow: inset 0 0 0 3px rgba(255,255,255,0.9), inset 0 0 0 5px rgba(0,0,0,0.55); }.szg3k-bar { position: absolute; width: 52px; height: 8px; border-radius: 5px; background: rgba(2, 4, 12, 0.72); border: 1px solid rgba(255,255,255,0.35); transform: translate(-50%, -100%); pointer-events: none; z-index: 450; }.szg3k-bar i { display: block; height: 100%; border-radius: 4px; background: #4ade80; }"}function d6(U,X,B,F){var I=document.createElement("div");I.className="szg3k-panel",I.setAttribute("data-szg3k-screen",U),I.setAttribute("role","dialog"),I.setAttribute("aria-modal","false"),I.setAttribute("aria-hidden","true"),I.tabIndex=-1;var S=document.createElement(X);S.id="szg3k-screen-title-"+Object.keys(O6).length,S.textContent=B,I.setAttribute("aria-labelledby",S.id),I.appendChild(S);var k=document.createElement("p");if(k.textContent=F,I.appendChild(k),E)E.appendChild(I);var b={el:I,title:S,text:k,mainBtn:null};return O6[U]=b,b}function b6(U,X,B){var F=document.createElement("button");if(F.textContent=X,F.onclick=function(){p9();try{gW("click")}catch(I){}try{B()}catch(I){N0('erro no clique do botão "'+X+'": '+I)}},U.el.appendChild(F),!U.mainBtn)U.mainBtn=F;return F}function p6(){if(m)return!0;try{if(typeof document>"u"||!document||!document.body)return!1;W0=document.createElement("style"),W0.id="szg3k-style",W0.textContent=N7(),document.head.appendChild(W0),E=document.createElement("div"),E.id="szg3k-stage",E.setAttribute("role","region"),E.setAttribute("aria-label","Jogo 3D interativo");var U=document.createElement("div");U.id="szg3k-frame",u=document.createElement("canvas"),u.id="szg3k-canvas",u.width=$.w,u.height=$.h,u.tabIndex=0,u.style.touchAction="none",u.setAttribute("aria-label","Cena do jogo 3D"),u.setAttribute("aria-describedby","szg3k-description"),U.appendChild(u),B0=U,E.appendChild(U),Q0=document.createElement("p"),Q0.id="szg3k-description",Q0.className="szg3k-sr-only",Q0.setAttribute("role","status"),Q0.setAttribute("aria-live","polite"),Q0.setAttribute("aria-atomic","true"),Q0.textContent="Jogo 3D interativo",E.appendChild(Q0),M0=document.createElement("p"),M0.id="szg3k-hud-status",M0.className="szg3k-sr-only",M0.setAttribute("role","status"),M0.setAttribute("aria-live","polite"),M0.setAttribute("aria-atomic","true"),E.appendChild(M0),document.body.appendChild(E);var X=d6("menu","h1","Meu Jogo 3D","WASD ou setas para andar");b6(X,"Jogar",function(){l7.setState("jogando")});var B=d6("pausa","h2","Pausa","");b6(B,"Continuar",function(){l7.setState("jogando")}),b6(B,"Sair para o menu",function(){l7.returnToMenu()}),d6("carregando","h2","Carregando...","Montando o mundo...");var F=d6("fim","h2","Fim de jogo","");b6(F,"Jogar de novo",function(){l7.setState("jogando")}),b6(F,"Sair para o menu",function(){l7.returnToMenu()});var I=d6("vitoria","h2","Vitória!","Você venceu!");return b6(I,"Jogar de novo",function(){l7.setState("jogando")}),b6(I,"Sair para o menu",function(){l7.returnToMenu()}),m=!0,!0}catch(S){return N0("não consegui montar a tela do jogo: "+S),!1}}function u8(U){if(!m)return;for(var X in O6){var B=O6[X];if(B&&B.el)B.el.classList.remove("szg3k-active"),B.el.setAttribute("aria-hidden","true")}if(U&&u&&u.focus)try{u.focus({preventScroll:!0})}catch(F){m0("focus-canvas","não consegui focar a cena do jogo: "+F)}}function F7(U){if(!p6())return;var X=K0(U,""),B=O6[X];if(!B){N0('a tela "'+X+'" não existe — crie com "Criar a tela" (prontas: menu, pausa, carregando, fim, vitoria)');return}if(u8(!1),B.el.classList.add("szg3k-active"),B.el.setAttribute("aria-hidden","false"),Q0)Q0.textContent=["Jogo 3D interativo",B.title.textContent,B.text.textContent].filter(Boolean).join(". ");if(B.el.focus)try{B.el.focus({preventScroll:!0})}catch(F){m0("focus-screen",'não consegui focar a tela "'+X+'": '+F)}}function o3(U){if(!m)return;if(U==="menu")F7("menu");else if(U==="pausado")F7("pausa");else if(U==="fim")F7("fim");else if(U==="vitoria")F7("vitoria");else if(U==="carregando")F7("carregando");else u8(!0)}function mZ(){if(x0=null,!M0)return;var U=[],X=Object.keys(D0).sort();for(var B=0;B<X.length;B++){var F=D0[X[B]];if(F)U.push(F)}var I=U.join(". ");if(I!==P0)P0=I,M0.textContent=I;a0=Date.now()}function dZ(){if(x0!==null)clearTimeout(x0),x0=null;if(D0=Object.create(null),P0="",a0=-500,M0)M0.textContent=""}function cZ(U,X){if(X)D0[U]=X;else delete D0[U];var B=500-(Date.now()-a0);if(B<=0){if(x0!==null)clearTimeout(x0),x0=null;mZ()}else if(x0===null)x0=setTimeout(mZ,B)}var a3={"top-left":1,"top-center":1,"top-right":1,"bottom-left":1,"bottom-right":1};function r3(U,X){if(!p6())return;var B=K0(U,"top-left");if(!a3[B])B="top-left";var F=K0(X,""),I=q0[B];if(!F){if(I&&I.parentNode)I.parentNode.removeChild(I);delete q0[B],cZ(B,"");return}if(!I)I=document.createElement("div"),I.className="szg3k-hud szg3k-hud-"+B,B0.appendChild(I),q0[B]=I;I.textContent=F,cZ(B,F)}function YQ(U,X){if(!U||U.retired)return;U.retired=!0,HQ(U.template),nZ(U,X)}function nZ(U,X){if(!U.retired||U.resourceCount!==0)return;var B=X||new Set;U.ownedMaterials.forEach(function(F){if(!F||!F.dispose||B.has(F))return;B.add(F);try{F.dispose()}catch(I){m0("dispose-mold","não consegui liberar um material antigo: "+I)}}),U.ownedMaterials.clear(),U.template=null}function t3(U){var X=p,B=U==="jogando"&&X==="pausado";if(p=U,i=!1,O0=!1,U!=="jogando")v9();if(o3(U),U==="jogando"&&X!=="jogando"&&X!=="pausado"){L0=0,J6=!1;for(var F in Q6)IQ(Q6[F]);for(var I=0;I<x.length;I++)x[I].timer=0;if(eY(),Aq(),Mq(),R7.on=!1,R7.left=0,$7=0,IU(),u0)e3(),iZ()}var S=B?null:I0[U];if(S)for(var k=0;k<S.length;k++)try{S[k]()}catch(b){N0('erro no "quando o jogo entrar no estado '+U+'": '+b)}}function l8(U){var X=K0(U,"");if(!X)return;if(A.push(X),j)return;j=!0;var B=0;try{while(A.length){var F=A.shift();if(!F||F===p)continue;if(B>=M){m0("game-state-cycle","as mudanças de estado do jogo entraram em ciclo — revise os ganchos de entrada"),A.length=0;break}B++,t3(F)}}finally{j=!1,A.length=0}}function e3(){iq(),dZ(),v0=null,J0.length=0,I0=Object.create(null),y0=Object.create(null),D6=Object.create(null),o0=Object.create(null),g0=Object.create(null),A6=Object.create(null),kQ.length=0,s0.length=0,x.length=0,tZ();for(var U=0;U<f.length;U++){var X=f[U];if(U0&&X)U0.remove(X);if(X&&X.dispose)try{X.dispose()}catch(b){m0("dispose-light","não consegui liberar uma luz antiga: "+b)}}f.length=0;for(var B in w0)w9(w0[B]);ZW();var F=new Set;for(var I in z0)YQ(z0[I],F);for(var S=0;S<B6.length;S++){var k=B6[S];if(k&&k.parentNode)k.parentNode.removeChild(k)}B6.length=0,z0=Object.create(null),e0=0,Q6=Object.create(null),Y0=0,vU(),w0=Object.create(null),c0=0,X6.length=0,I$=!1,C9=!1,R9=!1}function iZ(){if(typeof u0!=="function"||t0)return;t0=!0;try{u0()}catch(U){N0('erro em "Ao iniciar": '+U)}t0=!1}function $U(U){if(typeof U!=="function"){N0("o projeto precisa de uma função de início");return}u0=U,iZ()}function JU(){if(window.addEventListener("keydown",function(X){p9();var B=String(X.key).toLowerCase(),F=o[B]===!0;if(o[B]=!0,F||X.repeat===!0)return;if($0[B]=!0,B===$.pauseKey){if(p==="jogando")l8("pausado");else if(p==="pausado")l8("jogando")}}),window.addEventListener("keyup",function(X){o[String(X.key).toLowerCase()]=!1}),u&&u.addEventListener)u.addEventListener("pointerdown",function(){p9(),i=!0,O0=!0});var U=function(){i=!1};window.addEventListener("pointerup",U),window.addEventListener("pointercancel",function(){i=!1,O0=!1}),window.addEventListener("contextmenu",function(){o={},$0={}}),window.addEventListener("blur",function(){o={},$0={},i=!1,O0=!1,v9()}),x9()}function sZ(){if(!m||!u)return;var U=$.w/$.h,X=15,B=window.innerWidth-X*2,F=window.innerHeight-X*2;if(!(B>0)||!(F>0))return;var I,S;if(B/F>U)S=F,I=S*U;else I=B,S=I/U;u.style.width=I+"px",u.style.height=S+"px"}function oZ(U,X,B){var F=Math.max(1,a(U,1280)),I=Math.max(1,a(X,720)),S=Math.max(1,a(B,4096)),k=Math.min(1,S/F,S/I,Math.sqrt(G/(F*I)));return{w:Math.max(1,Math.floor(F*k)),h:Math.max(1,Math.floor(I*k))}}function QU(){if(n)return!0;try{H6=new l6,w6=new l6,P$=new x8,J7=new l6(0,0,-1),f8=new l6(1,0,0),X0=new yZ({antialias:!0,canvas:u});var U=X0.capabilities&&X0.capabilities.maxTextureSize?X0.capabilities.maxTextureSize:4096,X=oZ($.w,$.h,U);if($.w=X.w,$.h=X.h,X0.setPixelRatio(1),X0.setSize($.w,$.h,!1),X0.shadowMap){if(X0.shadowMap.enabled=$.shadows!==!1,aJ)X0.shadowMap.type=aJ}if(Q5)X0.toneMapping=Q5;if(U0=new eJ,aZ(),z$){var B=z$;z$=null,UW(B)}if(H0=new U9(60,$.w/$.h,0.1,Math.max(1000,$.world*6)),Z6=new t1(16777215,$.ambient),U0.add(Z6),$.fog)U0.fog=new J9($.fog.color,$.fog.near,$.fog.far);var F=new t5(16777215,1);if(F.position.set($.world*0.35,$.world*0.55,$.world*0.25),F.castShadow=!0,F.shadow&&F.shadow.camera){var I=$.world*0.6;if(F.shadow.camera.near=0.5,F.shadow.camera.far=$.world*2,F.shadow.camera.left=-I,F.shadow.camera.right=I,F.shadow.camera.top=I,F.shadow.camera.bottom=-I,F.shadow.mapSize&&F.shadow.mapSize.set)F.shadow.mapSize.set(1024,1024);F.shadow.normalBias=0.05}U0.add(F);var S=new Y9($.world,$.world),k=new L8({color:$.ground});T0=new O8(S,k),T0.rotation.x=-Math.PI/2,T0.receiveShadow=!0,U0.add(T0);for(var b=0;b<j0.length;b++)rZ(j0[b]);if(j0.length=0,R0.kind==="orbit")y9(R0.dist);return TW(0),n=!0,!0}catch(e){return N0("não consegui montar o mundo 3D: "+e),!1}}function aZ(){if(!U0)return;if(LQ(),U0.environment=null,U0.background&&U0.background.isTexture)z8(U0.background,"dispose-sky");U0.background=null;try{var U=document.createElement("canvas");U.width=2,U.height=256;var X=U.getContext("2d");if(!X){U0.background=new P7($.sky);return}var B=X.createLinearGradient(0,0,0,256);B.addColorStop(0,$.sky),B.addColorStop(1,$.skyBottom?$.skyBottom:p8($.sky,0.55)),X.fillStyle=B,X.fillRect(0,0,2,256),U0.background=new xJ(U)}catch(F){try{U0.background=new P7($.sky)}catch(I){}}}function rZ(U){if(!Y5)return;var X=new Y5(U.color,U.intensity,0);X.position.set(U.x,U.y,U.z),U0.add(X),f.push(X)}function ZU(U,X,B,F,I){if(f.length+j0.length>=Y){m0("light-limit","o mundo já tem "+Y+" luzes extras — reutilize as existentes");return}var S={color:K0(U,"#ffffff"),x:a(X,0),y:a(B,5),z:a(F,0),intensity:Math.max(0,a(I,1))};if(!n){j0.push(S);return}rZ(S)}function WU(U,X,B){if($.fog={color:K0(U,"#9ca3af"),near:a(X,8),far:a(B,$.world)},n&&J9)U0.fog=new J9($.fog.color,$.fog.near,$.fog.far)}function KU(U,X){if(L9++,PQ(),$.sky=K0(U,$.sky),X!=null)$.skyBottom=K0(X,"");if(n)aZ()}function UU(U){if($.ambient=Math.max(0,a(U,0.55)),Z6)Z6.intensity=$.ambient}function tZ(){var U=new Set;for(var X=0;X<E0.length;X++){var B=E0[X];if(B.parent)B.parent.remove(B);if(B.material&&B.material.dispose&&!U.has(B.material)){U.add(B.material);try{B.material.dispose()}catch(F){m0("dispose-decor","não consegui liberar um material de enfeite: "+F)}}}E0.length=0}function YU(U){if(!n&&!qU("Espalhar enfeites"))return;var X=Math.max(0,Math.min(K,Math.floor(a(U,16))));tZ();var B=$.world*0.45,F=N9("rock"),I=N9("crystal"),S=new L8({color:$.accent});if(S.emissive&&S.emissive.set)S.emissive.set($.accent),S.emissiveIntensity=0.25;for(var k=0;k<X;k++){var b=k%2===0,e=b?F:I,s;if(b){var G0=90+Math.floor(h0()*60);s=new L8({color:"rgb("+G0+", "+G0+", "+(G0+8)+")"})}else s=S;var V0=new O8(e,s),f0=h0()*Math.PI*2,W6=Math.sqrt(h0())*B,$6=b?0.5+h0()*1.3:0.4+h0()*0.8;V0.scale.set($6,b?$6*0.7:$6*1.6,$6),V0.position.set(Math.cos(f0)*W6,b?$6*0.35:$6*0.8,Math.sin(f0)*W6),V0.rotation.y=h0()*Math.PI*2,V0.castShadow=!1,V0.receiveShadow=!0,V0.updateMatrix(),V0.matrixAutoUpdate=!1,U0.add(V0),E0.push(V0)}}function qU(U){return N0('"'+U+'" só funciona durante a partida — deixe-o num gancho (ex.: quando entrar no estado jogando)'),!1}function H9(U){var X=$.world/2,B=(U+X)/($.world||1);if(B<0)B=0;if(B>1)B=1;var F=Math.floor(B*P8);return F>=P8?P8-1:F}function eZ(U,X,B,F){return U[0]=H9(X-F),U[1]=H9(B-F),U[2]=H9(X+F),U[3]=H9(B+F),U}function XU(U,X){for(var B=X[0];B<=X[2];B++)for(var F=X[1];F<=X[3];F++){var I=B+","+F;(g8[I]||(g8[I]=[])).push(U)}U._gi=X}function qQ(U){var X=U._gi;if(!X)return;for(var B=X[0];B<=X[2];B++)for(var F=X[1];F<=X[3];F++){var I=g8[B+","+F];if(!I)continue;var S=I.indexOf(U);if(S!==-1)I.splice(S,1)}U._gi=null}function XQ(U){var X=z0[U._mold],B=X?Math.max(0.5,X.radius):0.5,F=U.mesh.position,I=eZ(WQ,F.x,F.z,B),S=U._gi;if(S&&S[0]===I[0]&&S[1]===I[1]&&S[2]===I[2]&&S[3]===I[3])return;qQ(U),XU(U,[I[0],I[1],I[2],I[3]])}function L5(U,X,B){F5++,O5.length=0;var F=eZ(KQ,U,X,B);for(var I=F[0];I<=F[2];I++)for(var S=F[1];S<=F[3];S++){var k=g8[I+","+S];if(!k)continue;for(var b=0;b<k.length;b++){var e=k[b];if(e._stamp!==F5)e._stamp=F5,O5.push(e)}}return O5}function GU(){var U=new V$,X=[-0.5,0,-0.5,0.5,0,-0.5,0.5,0,0.5,-0.5,0,0.5,-0.5,1,0.5,0.5,1,0.5],B=[0,2,1,0,3,2,3,4,2,2,4,5,0,1,5,0,5,4,1,2,5,0,4,3];return U.setAttribute("position",new uJ(X,3)),U.setIndex(B),U.computeVertexNormals(),U}var r7=null;function N9(U){if(!r7)r7={};if(r7[U])return r7[U];var X;if(U==="sphere")X=new TZ(0.5,20,14);else if(U==="cylinder")X=new QZ(0.5,0.5,1,20);else if(U==="cone")X=new fJ(0.5,1,20);else if(U==="plane")X=new Y9(1,1);else if(U==="torus")X=new vZ(0.35,0.15,12,24);else if(U==="pyramid")X=new fJ(0.5,1,4);else if(U==="rampa")X=GU();else if(U==="rock")X=new UZ(0.5,0);else if(U==="crystal")X=new EZ(0.5,0);else X=new JZ(1,1,1);return r7[U]=X,X}var $W=typeof window<"u"&&window.__SZGAME_ASSETS_3D&&typeof window.__SZGAME_ASSETS_3D==="object"?window.__SZGAME_ASSETS_3D:{},GQ=null,VQ=null,F9=[],O9=null,Q7=null,m8=null,P5=[],t7=null,p7=null,BQ=null,z$=null,L9=0,VU=1e4;function JW(U){var X=U.indexOf(",");if(X<0)return null;try{var B=atob(U.slice(X+1)),F=B.length,I=new Uint8Array(F);for(var S=0;S<F;S++)I[S]=B.charCodeAt(S);return I.buffer}catch(k){return null}}function BU(){while(P5.length){var U=P5.pop();if(U)U()}}function QW(U){var X=!1;if(U.traverse(function(B){if(B.isSkinnedMesh)X=!0}),!X)return U.clone();if(O9&&O9.clone)return O9.clone(U);throw Error("não consegui criar ossos independentes para este modelo")}function HQ(U,X){if(!U||!U.traverse)return;var B=X||new Set;U.traverse(function(F){var I=F.isSkinnedMesh&&F.skeleton;if(!I||B.has(I))return;B.add(I);try{I.dispose()}catch(S){m0("dispose-model-skeleton","não consegui liberar os ossos de um modelo: "+S)}})}function P9(U,X){if(!U||!U.owner)return;var B=U.owner;U.owner=null;var F=U.mixer;if(F)try{F.stopAllAction(),F.uncacheRoot(U.mesh)}catch(I){m0("dispose-model-mixer","não consegui liberar um movimento antigo: "+I)}if(HQ(U.mesh,X&&X.skeletons),U.mesh&&U.mesh.userData)delete U.mesh.userData.szEntity;B.resourceCount--,nZ(B,X&&X.materials)}function NQ(U,X){if(!U)return;var B=0;for(var F=0;F<U.free.length;F++){var I=U.free[F];if(I.owner===X&&I.revision===X.resourceRevision)U.free[B++]=I;else P9(I)}U.free.length=B}function FQ(U,X,B){var F=kU(X),I=z0[X._mold];if(I&&F.owner===I&&F.revision===I.resourceRevision)U.free.push(F);else P9(F,B)}function ZW(U){for(var X in Q6){var B=Q6[X];IQ(B,U);for(var F=0;F<B.free.length;F++)P9(B.free[F],U);B.free.length=0}}function HU(U,X){if(!X.modelClips||!X.modelClips.length||!Z5)return;try{U._mixer=new Z5(U.mesh),U._clips=X.modelClips,U._action=null}catch(B){U._mixer=null}}function NU(U,X){if(!U._clips)return null;var B=K0(X,"");for(var F=0;F<U._clips.length;F++)if(U._clips[F]&&U._clips[F].name===B)return U._clips[F];return null}function WW(U,X,B){if(!d0(U)||!U._mixer)return;var F=NU(U,X);if(!F){m0("anim:"+U._mold+":"+K0(X,""),'o modelo do molde "'+U._mold+'" não tem a animação "'+K0(X,"")+'"');return}try{var I=U._mixer.clipAction(F),S=B===!1,k=S?LZ:PZ;if(U._action===I&&I.loop===k&&(!I.isRunning||I.isRunning()))return;var b=U._action;if(I.reset(),I.setLoop(k,S?1:1/0),I.clampWhenFinished=S,I.fadeIn(0.2),I.play(),b&&b!==I)b.fadeOut(0.2);U._action=I}catch(e){}}function OQ(U){if(!d0(U)||!U._mixer)return;try{U._mixer.stopAllAction()}catch(X){}U._action=null}function FU(U){if(!U||!X0||!U0||!H0)return;try{var X=X0.compileAsync&&(!X0.extensions||!X0.extensions.has||X0.extensions.has("KHR_parallel_shader_compile"));if(X){var B=X0.compileAsync(U,H0,U0);if(B&&B.catch)B.catch(function(F){if(!W7)m0("model-warm","não consegui aquecer um modelo 3D: "+F)})}else if(X0.compile)X0.compile(U,H0,U0)}catch(F){}try{U.traverse(function(F){if(!F.isMesh||!F.material||!X0.initTexture)return;for(var I in F.material){var S=F.material[I];if(S&&S.isTexture)try{X0.initTexture(S)}catch(k){}}})}catch(F){}}function OU(U){var X={meshes:0,triangles:0,bones:0,materials:0,drawCalls:0},B=new Set;try{U.traverse(function(F){if(F.isBone)X.bones++;if(!F.isMesh||!F.geometry)return;X.meshes++;var I=F.geometry;if(I.index&&I.index.count!=null)X.triangles+=Math.floor(I.index.count/3);else if(I.attributes&&I.attributes.position)X.triangles+=Math.floor(I.attributes.position.count/3);var S=F.material&&F.material.length?F.material:[F.material];X.drawCalls+=Math.max(1,S.length);for(var k=0;k<S.length;k++)if(S[k])B.add(S[k])})}catch(F){return null}return X.materials=B.size,X}function LU(U,X){if(!X)return'não consegui medir a complexidade do modelo "'+U+'"';if(X.meshes>V)return'o modelo "'+U+'" tem '+X.meshes+" malhas — o máximo é "+V+"; una as peças no editor 3D";if(X.triangles>H)return'o modelo "'+U+'" tem triângulos demais ('+X.triangles+" > "+H+")";if(X.bones>N)return'o modelo "'+U+'" tem ossos demais ('+X.bones+" > "+N+")";if(X.materials>O)return'o modelo "'+U+'" tem materiais demais ('+X.materials+" > "+O+")";if(X.drawCalls>P)return'o modelo "'+U+'" exige chamadas de desenho demais ('+X.drawCalls+" > "+P+")";return""}function z9(U,X){HQ(U,X&&X.skeletons);var B=new Set,F=new Set,I=new Set;try{U.traverse(function(S){if(S.geometry)B.add(S.geometry);var k=S.material&&S.material.length?S.material:[S.material];for(var b=0;b<k.length;b++){var e=k[b];if(!e||F.has(e))continue;F.add(e);for(var s in e){var G0=e[s];if(G0&&G0.isTexture)I.add(G0)}}})}catch(S){m0("dispose-imported-traverse","não consegui percorrer um modelo rejeitado para liberar recursos: "+S)}I.forEach(function(S){if(X&&X.textures&&X.textures.has(S))return;if(X&&X.textures)X.textures.add(S);if(S.dispose)try{S.dispose()}catch(k){m0("dispose-imported-texture","não consegui liberar uma textura de modelo rejeitado: "+k)}}),F.forEach(function(S){if(X&&X.materials&&X.materials.has(S))return;if(X&&X.materials)X.materials.add(S);if(S.dispose)try{S.dispose()}catch(k){m0("dispose-imported-material","não consegui liberar um material de modelo rejeitado: "+k)}}),B.forEach(function(S){if(X&&X.geometries&&X.geometries.has(S))return;if(X&&X.geometries)X.geometries.add(S);if(S.dispose)try{S.dispose()}catch(k){m0("dispose-imported-geometry","não consegui liberar uma geometria de modelo rejeitado: "+k)}})}function PU(U){if(!Q7)return;var X=new Set;for(var B in Q7){var F=Q7[B];if(!F||!F.scene||X.has(F.scene))continue;X.add(F.scene),z9(F.scene,U)}Q7=null}function zU(U){var X=[];if(!U||!U.traverse)return X;var B=new Set;return U.traverse(function(F){if(!F||!F.material)return;var I=Array.isArray(F.material)?F.material:[F.material];for(var S=0;S<I.length;S++){var k=I[S];if(!k||B.has(k))continue;B.add(k);var b=k.userData&&k.userData.molda,e=b&&b.flipbook;if(!e||e.contract!==1)continue;var{columns:s,rows:G0,fps:V0}=e,f0=s*G0;if(!Number.isInteger(s)||!Number.isInteger(G0)||s<1||G0<1||f0>256)continue;if(!Number.isFinite(V0)||V0<0.1||V0>60||typeof e.loop!=="boolean")continue;var W6=e.frames;if(!Array.isArray(W6)||!W6.length||W6.length>256)continue;if(!W6.every(function(z6){return Number.isInteger(z6)&&z6>=0&&z6<f0}))continue;var $6=W6.slice();X.push({material:k,columns:s,rows:G0,frames:$6,fps:V0,loop:e.loop!==!1,t:0,step:-1})}}),X}function KW(U,X){var B=U.material&&U.material.map;if(!B||!B.offset||!B.repeat)return!1;var F=U.frames[X];return B.repeat.set(1/U.columns,1/U.rows),B.offset.set(F%U.columns/U.columns,Math.floor(F/U.columns)/U.rows),!0}function IU(){if(!Q7)return;for(var U in Q7){var X=Q7[U],B=X&&X.flipbooks;if(!B)continue;for(var F=0;F<B.length;F++){var I=B[F];if(I.t=0,I.step=-1,KW(I,0))I.step=0}}}function DU(U){if(!Q7)return;for(var X in Q7){var B=Q7[X],F=B&&B.flipbooks;if(!F||!F.length)continue;for(var I=0;I<F.length;I++){var S=F[I];S.t+=U;var k=S.frames.length/S.fps,b;if(S.loop)b=Math.floor(S.t%k*S.fps)%S.frames.length;else b=Math.min(S.frames.length-1,Math.floor(S.t*S.fps));if(b===S.step)continue;if(KW(S,b))S.step=b}}}function CU(U,X){var B=K0(U,"");if(!B||W7)return null;if(!Q7)Q7=Object.create(null);if(Q7[B])return Q7[B];if(!m8)m8=Object.create(null);if(m8[B]){if(typeof X==="function")m8[B].push(X);return null}var F=$W[B];if(!F||F.kind!=="model3d")return N0('o modelo "'+B+'" não está no projeto — a peça fica com a forma de reserva'),null;var I=JW(F.dataUrl);if(!I)return null;m8[B]=typeof X==="function"?[X]:[];var S=null;F0.push(new Promise(function(V0){S=V0}));var k=!1,b=null,e=null,s=function(V0){if(k)return;if(k=!0,b!==null)clearTimeout(b),b=null;var f0=P5.indexOf(e);if(f0>=0)P5.splice(f0,1);var W6=m8[B]||[];if(delete m8[B],V0)for(var $6=0;$6<W6.length;$6++)try{W6[$6](V0)}catch(z6){}if(S)S()};e=function(){s(null)},P5.push(e);var G0=function(V0){if(k)return;if(W7){s(null);return}GQ=V0;try{new V0.GLTFLoader().parse(I,"",function(f0){if(k){if(f0&&f0.scene)z9(f0.scene);return}if(f0&&f0.scene){if(W7){z9(f0.scene),s(null);return}var W6=OU(f0.scene),$6=LU(B,W6);if($6){N0($6+" — a peça fica com a forma de reserva"),z9(f0.scene),s(null);return}Q7[B]={scene:f0.scene,clips:f0.animations||[],metrics:W6,flipbooks:zU(f0.scene)},FU(f0.scene),s(Q7[B])}else N0('o modelo "'+B+'" veio vazio — a peça fica com a forma de reserva'),s(null)},function(f0){if(!W7)N0('não consegui abrir o modelo "'+B+'": '+f0);s(null)})}catch(f0){N0('não consegui abrir o modelo "'+B+'": '+f0),s(null)}};if(b=setTimeout(function(){if(!W7)N0('o modelo "'+B+'" demorou demais para carregar — a peça fica com a forma de reserva');s(null)},VU),GQ)return G0(GQ),null;try{Promise.all([Promise.resolve().then(() => (p3(),g3)),Promise.resolve().then(() => (c3(),d3)).catch(function(){return null})]).then(function(V0){if(W7){s(null);return}if(V0[1]&&V0[1].clone)O9=V0[1];G0(V0[0])},function(V0){if(!W7)N0("não consegui carregar o leitor de modelos: "+V0);s(null)})}catch(V0){N0("não consegui carregar o leitor de modelos: "+V0),s(null)}return null}function z8(U,X){if(!U||!U.dispose)return;try{U.dispose()}catch(B){m0(X,"não consegui liberar uma textura antiga: "+B)}}function LQ(){var U=BQ;if(BQ=null,U0){if(U0.background===U)U0.background=null;if(U0.environment===U)U0.environment=null}z8(U,"dispose-hdr")}function PQ(){var U=z$;z$=null,z8(U,"dispose-pending-hdr")}function UW(U){if(!U)return;if(LQ(),U0&&U0.background&&U0.background.isTexture)z8(U0.background,"dispose-sky");if(!U0){PQ(),z$=U;return}U0.background=U,U0.environment=U,BQ=U}function YW(U){if(!U)return null;var X=U.clone?U.clone():null;if(!X&&U.image)X=new W5(U.image.data,U.image.width,U.image.height);if(!X)return null;if(U5!=null)X.mapping=U5;return X.needsUpdate=!0,X}function RU(U){if(VQ){U(VQ);return}if(F9.push(U),F9.length>1)return;var X=function(B){if(B)VQ=B;var F=F9.slice();F9.length=0;for(var I=0;I<F.length;I++)F[I](B)};try{Promise.resolve().then(() => (s3(),i3)).then(X,function(B){N0("não consegui carregar o leitor de céu: "+B),X(null)})}catch(B){N0("não consegui carregar o leitor de céu: "+B),X(null)}}function EU(U,X,B){if(!t7)t7=Object.create(null);if(t7[U]){B(YW(t7[U]));return}if(!p7)p7=Object.create(null);if(p7[U]){p7[U].push(B);return}p7[U]=[B];var F=function(S){var k=p7&&p7[U]?p7[U]:[];if(p7)delete p7[U];for(var b=0;b<k.length;b++)k[b](YW(S))},I=JW(X.dataUrl);if(!I){N0('não consegui ler os dados do céu "'+U+'"'),F(null);return}RU(function(S){if(!S){F(null);return}try{var k=new S.HDRLoader().parse(I);if(!k){F(null);return}var b=k.isTexture?k:new W5(k.data,k.width,k.height);if(!k.isTexture){if(k.type!=null)b.type=k.type;if(Y7!=null)b.colorSpace=Y7;if(s6!=null)b.minFilter=s6,b.magFilter=s6;b.generateMipmaps=!1,b.flipY=!0}if(U5!=null)b.mapping=U5;if(b.needsUpdate=!0,W7){z8(b,"dispose-late-hdr"),F(null);return}t7[U]=b,F(b)}catch(e){N0('não consegui abrir o céu "'+U+'": '+e),F(null)}})}function SU(U){var X=K0(U,""),B=$W[X];if(!B||B.kind!=="environment3d"){N0('o céu "'+X+'" não está no projeto (envie um arquivo .hdr)');return}var F=++L9;EU(X,B,function(I){if(!I)return;if(W7||F!==L9){z8(I,"dispose-stale-hdr");return}UW(I)})}function AU(U){var X=K0(U,"");if(!X||!X5)return null;var B=w[X]||(X.indexOf("data:")===0?X:null);if(!B)return null;if(!c)c={};if(c[B])return c[B];var F=new X5().load(B);if(N$)F.magFilter=N$,F.needsUpdate=!0;if(s7)F.colorSpace=s7;return c[B]=F,F}function jU(U,X,B){var F=K0(U,"");if(!F){N0('"Criar o molde 3D" precisa de um nome');return}var I=z0[F];if(!I&&e0>=Z){m0("mold-limit","o mundo já tem "+Z+" moldes — reutilize um molde existente");return}var S=X&&typeof X==="object"?X:{},k;try{k=new h8}catch(e){N0('não consegui criar o molde "'+F+'": '+e);return}var b={name:F,health:Math.max(1,a(S.health,30)),speed:a(S.speed,3),template:k,ownedMaterials:new Set,resourceCount:0,resourceRevision:0,retired:!1,parts:0,radius:0.5,col:{kind:0,minX:0,maxX:0,minY:0,maxY:0,minZ:0,maxZ:0,r:0.5,rampAxis:2,rampY0:0,rampY1:0},hw:0,hd:0,top:0,solid:!1,trigger:!1,healthBar:!1,bounce:0,friction:-1,gravity:0,model:"",modelClips:null,modelTriangles:0,modelMeshes:0,modelBones:0,modelMaterials:0,modelDrawCalls:0,stateAnims:null};if(!I)e0++;if(z0[F]=b,!Q6[F])Q6[F]={active:[],free:[],_sweeping:0};if(I)YQ(I,new Set),NQ(Q6[F],b);if(typeof B==="function"){L6=b;try{B()}catch(e){N0('erro ao montar as peças do molde "'+F+'": '+e)}L6=null}if(b.parts===0)L6=b,XW({shape:"box",color:$.accent,w:1,h:1,d:1,x:0,y:0.5,z:0}),L6=null}var qW={box:{x:0.5,y:0.5,z:0.5,rot:0},sphere:{x:0.5,y:0.5,z:0.5,rot:0},cylinder:{x:0.5,y:0.5,z:0.5,rot:0},cone:{x:0.5,y:0.5,z:0.5,rot:0},pyramid:{x:0.5,y:0.5,z:0.5,rot:0},rampa:{x:0.5,y:0.5,z:0.5,rot:0},torus:{x:0.5,y:0.5,z:0.15,rot:0},plane:{x:0.5,y:0.5,z:0,rot:1},modelo:{x:0.5,y:0.5,z:0.5,rot:0},rock:{x:0.5,y:0.5,z:0.5,rot:0},crystal:{x:0.5,y:0.5,z:0.5,rot:0}},C7=0.1,c6={x:0,y:0,z:0};function wU(U,X,B,F,I){var S=qW[U]||qW.box;if(S.rot)I.x=S.x*X,I.y=S.z*F,I.z=S.y*B;else I.x=S.x*X,I.y=S.y*B,I.z=S.z*F;return I}function MU(U){var X=U.col;if(X.maxX-X.minX<C7){var B=(X.minX+X.maxX)/2;X.minX=B-C7/2,X.maxX=B+C7/2}if(X.maxY-X.minY<C7){var F=(X.minY+X.maxY)/2;X.minY=F-C7/2,X.maxY=F+C7/2}if(X.maxZ-X.minZ<C7){var I=(X.minZ+X.maxZ)/2;X.minZ=I-C7/2,X.maxZ=I+C7/2}U.hw=(X.maxX-X.minX)/2,U.hd=(X.maxZ-X.minZ)/2,U.top=X.maxY;var S=Math.max(Math.abs(X.minX),Math.abs(X.maxX)),k=Math.max(Math.abs(X.minZ),Math.abs(X.maxZ));U.radius=Math.max(0.5,Math.sqrt(S*S+k*k)),X.r=Math.max(U.hw,U.hd),X.rampY0=X.minY,X.rampY1=X.maxY}function XW(U){var X=L6;if(!X){N0('o bloco "Peça" só funciona DENTRO de "Criar o molde 3D"');return}if(X.parts>=Q){N0("molde com peças demais — o teto é "+Q+" por molde");return}var B=U&&typeof U==="object"?U:{},F=K0(B.shape,"box"),I=Math.max(0.05,a(B.w,1)),S=Math.max(0.05,a(B.h,1)),k=Math.max(0.05,a(B.d,1)),b=a(B.x,0),e=a(B.y,0.5),s=a(B.z,0);try{var G0=K0(B.color,$.accent),V0=new L8({color:G0});X.ownedMaterials.add(V0);var f0=K0(B.material,"normal");if(f0==="metal")V0.metalness=1,V0.roughness=0.25;else if(f0==="vidro")V0.transparent=!0,V0.opacity=0.4,V0.roughness=0;else if(f0==="brilho"){if(V0.emissive&&V0.emissive.set)V0.emissive.set(G0);V0.emissiveIntensity=1.4}var W6=B.texture?AU(B.texture):null;if(W6)V0.map=W6;var $6;if(F==="modelo"){$6=new h8;var z6=$6;if(X.model&&X.model!==K0(B.model,""))m0("twomodel:"+X.name,'o molde "'+X.name+'" tem mais de um modelo (.glb); a animação usa só o último ("'+K0(B.model,"")+'")');X.model=K0(B.model,""),X.modelClips=null;var q7=X.model,g6=!1,X7=function(h6){if(g6||W7||z0[X.name]!==X)return;try{var m7=QW(h6.scene);while(z6.children.length)z6.remove(z6.children[0]);if(z6.add(m7),g6=!0,X.model===q7)X.modelClips=h6.clips;X.modelTriangles+=h6.metrics.triangles,X.modelMeshes+=h6.metrics.meshes,X.modelBones+=h6.metrics.bones,X.modelMaterials+=h6.metrics.materials,X.modelDrawCalls+=h6.metrics.drawCalls,X.resourceRevision++,NQ(Q6[X.name],X)}catch(D8){m0("model-clone:"+X.name,'não consegui preparar o modelo do molde "'+X.name+'": '+D8)}},o6=CU(B.model,X7);if(o6)X7(o6);if(!g6)z6.add(new O8(N9("box"),V0))}else $6=new O8(N9(F),V0);if(F==="plane")$6.rotation.x=-Math.PI/2;$6.scale.set(I,S,k),$6.position.set(b,e,s),$6.castShadow=!0,$6.receiveShadow=!0,X.template.add($6),X.resourceRevision++,NQ(Q6[X.name],X),X.parts+=1,wU(F,I,S,k,c6);var F6=X.col;if(X.parts===1)F6.minX=b-c6.x,F6.maxX=b+c6.x,F6.minY=e-c6.y,F6.maxY=e+c6.y,F6.minZ=s-c6.z,F6.maxZ=s+c6.z;else{if(b-c6.x<F6.minX)F6.minX=b-c6.x;if(b+c6.x>F6.maxX)F6.maxX=b+c6.x;if(e-c6.y<F6.minY)F6.minY=e-c6.y;if(e+c6.y>F6.maxY)F6.maxY=e+c6.y;if(s-c6.z<F6.minZ)F6.minZ=s-c6.z;if(s+c6.z>F6.maxZ)F6.maxZ=s+c6.z}if(F==="rampa")F6.kind=3;MU(X)}catch(h6){N0("não consegui criar a peça: "+h6)}}function TU(){return{mesh:null,vx:0,vy:0,vz:0,drag:0,speed:0,health:0,maxHealth:0,state:"",stateTime:0,_stateChanging:!1,_stateQueue:[],gravity:0,grounded:!1,body:0,nx:0,ny:0,nz:0,_ride:null,_rideGen:0,_barGen:0,_dx:0,_dy:0,_dz:0,_lx:0,_ly:0,_lz:0,_inside:null,data:null,_alive:!1,_mold:"",_iFrames:0,_mixer:null,_clips:null,_action:null,_modelCost:null,_resourceOwner:null,_resourceRevision:0,_gen:0,_gi:null,_stamp:0}}function kU(U){return{mesh:U.mesh,mixer:U._mixer,clips:U._clips,gen:U._gen,owner:U._resourceOwner,revision:U._resourceRevision}}function vU(){C0.triangles=0,C0.meshes=0,C0.bones=0,C0.materials=0,C0.drawCalls=0}function _U(U){if(C0.triangles+U.modelTriangles>D)return"triângulos";if(C0.meshes+U.modelMeshes>C)return"malhas";if(C0.bones+U.modelBones>z)return"ossos";if(C0.materials+U.modelMaterials>L)return"materiais";if(C0.drawCalls+U.modelDrawCalls>T)return"chamadas de desenho";return""}function yU(U,X){var B={triangles:X.modelTriangles,meshes:X.modelMeshes,bones:X.modelBones,materials:X.modelMaterials,drawCalls:X.modelDrawCalls};U._modelCost=B,C0.triangles+=B.triangles,C0.meshes+=B.meshes,C0.bones+=B.bones,C0.materials+=B.materials,C0.drawCalls+=B.drawCalls}function GW(U){var X=U&&U._modelCost;if(!X)return;C0.triangles=Math.max(0,C0.triangles-X.triangles),C0.meshes=Math.max(0,C0.meshes-X.meshes),C0.bones=Math.max(0,C0.bones-X.bones),C0.materials=Math.max(0,C0.materials-X.materials),C0.drawCalls=Math.max(0,C0.drawCalls-X.drawCalls),U._modelCost=null}function I9(U,X,B,F){if(!n)return N0('"Nascer" só funciona durante a partida — use dentro de "quando o jogo entrar no estado jogando"'),null;var I=K0(U,""),S=z0[I];if(!S)return N0('o molde "'+I+'" não existe — crie com "Criar o molde 3D"'),null;var k=_U(S);if(k)return m0("model-live-budget:"+k,"os modelos 3D vivos chegaram ao orçamento global de "+k+" — recolha uma entidade antes de criar outra"),null;if(Y0>=J){if(!J6)J6=!0,N0("o mundo lotou ("+J+" entidades) — recolha as que saírem do jogo");return null}var b=Q6[I]||(Q6[I]={active:[],free:[],_sweeping:0}),e=b.free.pop();while(e&&(e.owner!==S||e.revision!==S.resourceRevision))P9(e),e=b.free.pop();var s=TU();if(e)s.mesh=e.mesh,s._mixer=e.mixer,s._clips=e.clips,s._gen=e.gen;else try{s.mesh=QW(S.template),S.resourceCount++}catch(G0){return N0('não consegui fazer nascer do molde "'+I+'": '+G0),null}if(s._resourceOwner=S,s._resourceRevision=S.resourceRevision,s.mesh.userData)s.mesh.userData.szEntity=s;else s.mesh.userData={szEntity:s};if(U0&&s.mesh.parent!==U0)U0.add(s.mesh);if(s.mesh.visible=!0,s.mesh.matrixAutoUpdate=!0,s.mesh.position.set(a(X,0),a(B,0),a(F,0)),s.mesh.rotation.set(0,0,0),s.mesh.scale.set(1,1,1),s.vx=0,s.vy=0,s.vz=0,s.drag=0,s.speed=S.speed,s.health=S.health,s.maxHealth=S.health,s.stateTime=0,s.gravity=S.gravity?-Math.abs(S.gravity):0,s.grounded=!1,s.body=0,s.nx=0,s.ny=0,s.nz=0,s._ride=null,s._rideGen=0,s._dx=0,s._dy=0,s._dz=0,s._lx=a(X,0),s._ly=a(B,0),s._lz=a(F,0),s._inside=null,s.data={},s._alive=!0,s._mold=I,s._iFrames=0,!s._mixer)HU(s,S);else s._action=null;return s._gen=(s._gen||0)+1,s._gi=null,b.active.push(s),Y0+=1,yU(s,S),XQ(s),s.state="",CQ(s,"parado"),s}function hU(U,X){if(!d0(X))return null;var B=I9(U,d8(X,"x"),d8(X,"y"),d8(X,"z"));if(B&&X&&X.mesh&&B.mesh.quaternion&&X.mesh.quaternion)B.mesh.quaternion.copy(X.mesh.quaternion);return B}function xU(U,X,B,F){if(!d0(B))return;var I=Math.floor(a(X,8));if(I<1)I=1;if(I>60)I=60;var S=a(F,6),k=d8(B,"x"),b=d8(B,"y"),e=d8(B,"z");for(var s=0;s<I;s++){var G0=s/I*Math.PI*2,V0=I9(U,k,b,e);if(!V0)break;V0.vx=Math.sin(G0)*S,V0.vz=Math.cos(G0)*S}}function d0(U){return!!(U&&typeof U==="object"&&U.mesh&&U._alive===!0)}function bU(U,X){return d0(U)&&U._mold===K0(X,"")}function d8(U,X){if(!d0(U)||!U.mesh.position)return 0;var B=U.mesh.position[X];return typeof B==="number"&&isFinite(B)?B:0}function zQ(U){if(!U||typeof U!=="object"||!U._mold)return;if(!U._alive)return;if(U._mixer)OQ(U);if(GW(U),U._alive=!1,U._iFrames=0,U.mesh&&U0)U0.remove(U.mesh);qQ(U),Y0=Math.max(0,Y0-1);var X=Q6[U._mold];if(!X)return;if(X._sweeping===0){var B=X.active.indexOf(U);if(B>-1)X.active.splice(B,1),FQ(X,U)}}function D9(U){for(var X=U.active.length-1;X>=0;X--)if(!U.active[X]._alive){var B=U.active[X];U.active.splice(X,1),FQ(U,B)}}function IQ(U,X){for(var B=0;B<U.active.length;B++){var F=U.active[B];if(F._alive)Y0=Math.max(0,Y0-1),GW(F);if(F._mixer)OQ(F);if(F._alive=!1,F._iFrames=0,F.mesh&&U0)U0.remove(F.mesh);qQ(F),FQ(U,F,X)}U.active.length=0}function fU(U){var X=Q6[K0(U,"")];if(X)IQ(X)}function gU(U,X){var B=Q6[K0(U,"")];if(!B||typeof X!=="function")return;B._sweeping++;for(var F=B.active.length-1;F>=0;F--){var I=B.active[F];if(!I||!I._alive)continue;try{X(I)}catch(S){if(!X.__szg3kWarned)X.__szg3kWarned=!0,N0('erro no "para cada vivo": '+S)}}if(B._sweeping--,B._sweeping===0)D9(B)}function pU(U){var X=Q6[K0(U,"")];if(!X)return 0;var B=0;for(var F=0;F<X.active.length;F++)if(X.active[F]._alive)B++;return B}function uU(U,X){var B=Q6[K0(U,"")];if(!B)return;var F=Math.max(1,a(X,60)),I=F*F;B._sweeping++;for(var S=0;S<B.active.length;S++){var k=B.active[S];if(!k||!k._alive||!k.mesh)continue;var b=k.mesh.position;if(b.x*b.x+b.y*b.y+b.z*b.z>I)zQ(k)}if(B._sweeping--,B._sweeping===0)D9(B)}function lU(U,X,B){var F=K0(U,"");if(!F)return;var I=K0(B,"edge")==="anywhere"?"anywhere":"edge";for(var S=0;S<x.length;S++)if(x[S].mold===F){x[S].interval=Math.max(0.05,a(X,2)),x[S].where=I,x[S].timer=0;return}x.push({mold:F,interval:Math.max(0.05,a(X,2)),timer:0,where:I})}function mU(U){var X=K0(U,"");for(var B=x.length-1;B>=0;B--)if(x[B].mold===X)x.splice(B,1)}function dU(U){var X=$.world*0.45,B=h0()*Math.PI*2,F=U.where==="anywhere"?Math.sqrt(h0())*X:X;I9(U.mold,Math.cos(B)*F,0,Math.sin(B)*F)}var cU=32;function DQ(U,X){var B=K0(U,""),F=K0(X,"");if(!B||!F)return null;var I=D6[B]||(D6[B]=Object.create(null));return I[F]||(I[F]={enter:[],step:[],exit:[]})}function nU(U,X){var B=D6[U._mold],F=B&&U.state?B[U.state]:null;if(F)RQ(F.exit,U,"quando sair do estado "+U.state);if(!d0(U))return;U.state=X,U.stateTime=0;var I=z0[U._mold];if(I&&I.stateAnims&&U._mixer){var S=I.stateAnims[X];if(S)WW(U,S,!0)}B=D6[U._mold];var k=B?B[X]:null;if(k)RQ(k.enter,U,"quando entrar no estado "+X)}function CQ(U,X){if(!d0(U))return;var B=K0(X,"");if(!B||U.state===B)return;var F=U._stateQueue;if(!F)F=U._stateQueue=[];if(F.push(B),U._stateChanging)return;U._stateChanging=!0;var I=0;try{while(F.length&&d0(U)){var S=F.shift();if(!S||S===U.state)continue;if(I>=cU){m0("fsm-cycle:"+U._mold,'as mudanças de estado do molde "'+U._mold+'" entraram em ciclo — revise os ganchos de entrar/sair'),F.length=0;break}I++,nU(U,S)}}finally{U._stateChanging=!1,F.length=0}}function iU(U,X,B){var F=z0[K0(U,"")];if(!F)return;if(!F.stateAnims)F.stateAnims={};F.stateAnims[K0(X,"")]=K0(B,"")}function RQ(U,X,B){if(!U)return;for(var F=0;F<U.length;F++){var I=U[F];try{I(X,b0)}catch(S){if(!I.__szg3kWarned)I.__szg3kWarned=!0,N0('erro no "'+B+'": '+S)}}}function sU(U,X){var B=A6[U._mold];if(!B)return;for(var F=0;F<B.length;F++){var I=B[F];try{I(U,X)}catch(S){if(!I.__szg3kWarned)I.__szg3kWarned=!0,N0('erro no "Quando alguém encostar": '+S)}}}function oU(U,X,B,F){var I=K0(U,""),S=K0(X,""),k=K0(F,"");if(!I||!S||!k)return;for(var b=0;b<s0.length;b++)if(s0[b].mold===I&&s0[b].state===S){s0[b].sec=Math.max(0.05,a(B,1.5)),s0[b].next=k;return}s0.push({mold:I,state:S,sec:Math.max(0.05,a(B,1.5)),next:k})}var I$=!1,C9=!1,R9=!1,z5=1e9,VW=4,aU=0.64,rU=0.3,BW=0.02,tU=1.2,v6={minX:0,maxX:0,minY:0,maxY:0,minZ:0,maxZ:0},E9={minX:0,maxX:0,minY:0,maxY:0,minZ:0,maxZ:0},e7={t:1,nx:0,ny:0,nz:0,solid:null},c8={t:1,nx:0,ny:0,nz:0,solid:null},D$=[],$8=0;function C$(U,X){var B=z0[U._mold],F=U.mesh.position;if(!B){X.minX=F.x-0.5,X.maxX=F.x+0.5,X.minY=F.y,X.maxY=F.y+1,X.minZ=F.z-0.5,X.maxZ=F.z+0.5;return}var I=B.col;X.minX=F.x+I.minX,X.maxX=F.x+I.maxX,X.minY=F.y+I.minY,X.maxY=F.y+I.maxY,X.minZ=F.z+I.minZ,X.maxZ=F.z+I.maxZ}function HW(U,X,B,F){var I=U.mesh.rotation.y,S=X-U.mesh.position.x,k=B-U.mesh.position.z;if(!I)return F.x=S,F.z=k,F;var b=Math.cos(-I),e=Math.sin(-I);return F.x=S*b-k*e,F.z=S*e+k*b,F}var f6={x:0,z:0};function eU(U,X,B){var F=U.rampAxis===0?(X-U.minX)/(U.maxX-U.minX||1):(B-U.minZ)/(U.maxZ-U.minZ||1);if(F<0)F=0;if(F>1)F=1;return U.rampY0+(U.rampY1-U.rampY0)*F}function n8(U,X,B,F,I){if(B>=aU){if(U.grounded=!0,U.nx=X,U.ny=B,U.nz=F,I)U._ride=I,U._rideGen=I._gen}var S=U.vx*X+U.vy*B+U.vz*F;if(S<0){var k=I?z0[I._mold]:null,b=z0[U._mold],e=k?k.bounce:0,s=b?b.bounce:0;if(s>e)e=s;var G0=(1+e)*S;if(e>0&&Math.abs(S)<tU)G0=S;U.vx-=G0*X,U.vy-=G0*B,U.vz-=G0*F}}function NW(U){var X=U.mesh.position,B=z0[U._mold],F=B?B.col.minY:0;if(X.y+F<=0)X.y=-F,n8(U,0,1,0,null)}function FW(U,X){var B=U.mesh.position,F=z0[X._mold];if(!F)return!1;var I=F.col;if(C$(U,v6),I.kind===3){if(HW(X,B.x,B.z,f6),f6.x<I.minX||f6.x>I.maxX||f6.z<I.minZ||f6.z>I.maxZ)return!1;var X7=z0[U._mold],S=X7?X7.col.minY:0,k=X.mesh.position.y+eU(I,f6.x,f6.z);if(B.y+S<k&&B.y+S>k-1.2){B.y=k-S;var b=(I.rampAxis===0?I.maxX-I.minX:I.maxZ-I.minZ)||1,e=I.rampY1-I.rampY0,s=Math.sqrt(b*b+e*e)||1,G0=b/s,V0=-e/s,f0=X.mesh.rotation.y,W6=Math.cos(f0),$6=Math.sin(f0),z6=I.rampAxis===0?V0:0,q7=I.rampAxis===0?0:V0;return n8(U,z6*W6+q7*$6,G0,-z6*$6+q7*W6,X),!0}return!1}var g6=X.mesh.rotation.y;HW(X,B.x,B.z,f6);var X7=z0[U._mold],o6=X7?X7.col:null;if(o6&&(o6.kind===1||o6.kind===2)){var F6=o6.r,h6=B.y+o6.minY+F6,m7=B.y+o6.maxY-F6;if(o6.kind===1||m7<h6)h6=m7=B.y+(o6.minY+o6.maxY)/2;var D8=X.mesh.position.y+I.minY,s8=X.mesh.position.y+I.maxY,E7=(D8+s8)/2;if(E7<h6)E7=h6;if(E7>m7)E7=m7;var E5=f6.x<I.minX?I.minX:f6.x>I.maxX?I.maxX:f6.x,S5=E7<D8?D8:E7>s8?s8:E7,A5=f6.z<I.minZ?I.minZ:f6.z>I.maxZ?I.maxZ:f6.z,o8=f6.x-E5,a6=E7-S5,a8=f6.z-A5,S$=o8*o8+a6*a6+a8*a8;if(S$>0.000001){var k7=Math.sqrt(S$);if(k7>=F6)return!1;var r8=F6-k7,C8=o8/k7,A$=a6/k7,R8=a8/k7,j$=Math.cos(g6),t8=Math.sin(g6),u9=C8*j$+R8*t8,w$=-C8*t8+R8*j$;return B.x+=u9*r8,B.y+=A$*r8,B.z+=w$*r8,n8(U,u9,A$,w$,X),!0}}var e8=(v6.maxX-v6.minX)/2,E8=(v6.maxZ-v6.minZ)/2;if(g6){var j5=Math.max(e8,E8);e8=j5,E8=j5}var $$=Math.min(f6.x+e8,I.maxX)-Math.max(f6.x-e8,I.minX),l9=Math.min(f6.z+E8,I.maxZ)-Math.max(f6.z-E8,I.minZ),uW=X.mesh.position.y+I.minY,lW=X.mesh.position.y+I.maxY,w5=Math.min(v6.maxY,lW)-Math.max(v6.minY,uW);if($$<=0||w5<=0||l9<=0)return!1;var yQ=0.0001,hQ=Math.min($$,Math.min(w5,l9)),M5=$$<=hQ+yQ,T5=w5<=hQ+yQ,m9=l9<=hQ+yQ;if((M5?1:0)+(T5?1:0)+(m9?1:0)>1){var mW=M5?Math.abs(U.vx):-1,dW=T5?Math.abs(U.vy):-1,cW=m9?Math.abs(U.vz):-1;if(dW>=mW&&dW>=cW)M5=!1,m9=!1;else if(mW>=cW)T5=!1,m9=!1;else M5=!1,T5=!1}if(T5){if((v6.minY+v6.maxY)/2>(uW+lW)/2)B.y+=w5,n8(U,0,1,0,X);else B.y-=w5,n8(U,0,-1,0,X);return!0}var xQ=0,bQ=0,fQ=0,gQ=0;if(M5){var nW=(I.minX+I.maxX)/2,k5;if(f6.x<nW)k5=-1;else if(f6.x>nW)k5=1;else{var iW=U.vx*Math.cos(-g6)-U.vz*Math.sin(-g6);k5=iW>0?-1:iW<0?1:1}xQ=$$*k5,fQ=k5}else{var sW=(I.minZ+I.maxZ)/2,v5;if(f6.z<sW)v5=-1;else if(f6.z>sW)v5=1;else{var oW=U.vx*Math.sin(-g6)+U.vz*Math.cos(-g6);v5=oW>0?-1:oW<0?1:1}bQ=l9*v5,gQ=v5}var d9=Math.cos(g6),c9=Math.sin(g6);return B.x+=xQ*d9+bQ*c9,B.z+=-xQ*c9+bQ*d9,n8(U,fQ*d9+gQ*c9,0,-fQ*c9+gQ*d9,X),!0}function OW(U){for(var X=0;X<$8;X++){var B=D$[X];if(!B||!B._alive)continue;var F=z0[B._mold];if(!F||!F.solid)continue;FW(U,B)}}function $Y(U,X,B,F,I,S){var k=z0[X._mold];if(!k||!k.solid)return!1;if(k.col.kind===3)return!1;C$(U,v6);var b=(v6.minX+v6.maxX)*0.5,e=(v6.minY+v6.maxY)*0.5,s=(v6.minZ+v6.maxZ)*0.5,G0=(v6.maxX-v6.minX)*0.5,V0=(v6.maxY-v6.minY)*0.5,f0=(v6.maxZ-v6.minZ)*0.5,W6=X.mesh.rotation.y,$6=Math.cos(-W6),z6=Math.sin(-W6),q7=b-X.mesh.position.x,g6=s-X.mesh.position.z,X7=q7*$6-g6*z6,o6=q7*z6+g6*$6,F6=B*$6-I*z6,h6=B*z6+I*$6,m7=Math.abs($6)*G0+Math.abs(z6)*f0,D8=Math.abs(z6)*G0+Math.abs($6)*f0,s8=X7-m7,E7=X7+m7,E5=e-V0,S5=e+V0,A5=o6-D8,o8=o6+D8,a6=k.col,a8=X.mesh.position.y+a6.minY,S$=X.mesh.position.y+a6.maxY,k7=-1/0,r8=1/0,C8=-1/0,A$=1/0,R8=-1/0,j$=1/0;if(F6>0)k7=(a6.minX-E7)/F6,r8=(a6.maxX-s8)/F6;else if(F6<0)k7=(a6.maxX-s8)/F6,r8=(a6.minX-E7)/F6;else if(E7<=a6.minX||s8>=a6.maxX)return!1;if(F>0)C8=(a8-S5)/F,A$=(S$-E5)/F;else if(F<0)C8=(S$-E5)/F,A$=(a8-S5)/F;else if(S5<=a8||E5>=S$)return!1;if(h6>0)R8=(a6.minZ-o8)/h6,j$=(a6.maxZ-A5)/h6;else if(h6<0)R8=(a6.maxZ-A5)/h6,j$=(a6.minZ-o8)/h6;else if(o8<=a6.minZ||A5>=a6.maxZ)return!1;var t8=Math.max(k7,Math.max(C8,R8)),u9=Math.min(r8,Math.min(A$,j$));if(t8<0||t8>1||t8>u9)return!1;var w$=0,e8=0,E8=0;if(k7>=C8&&k7>=R8)w$=F6>0?-1:1;else if(C8>=R8)e8=F>0?-1:1;else E8=h6>0?-1:1;var j5=Math.cos(W6),$$=Math.sin(W6);return S.t=t8,S.nx=w$*j5+E8*$$,S.ny=e8,S.nz=-w$*$$+E8*j5,S.solid=X,!0}function JY(U,X,B,F,I){I.t=1,I.nx=0,I.ny=0,I.nz=0,I.solid=null;var S=!1;for(var k=0;k<$8;k++){var b=D$[k];if(!b||!b._alive)continue;if(!$Y(U,b,X,B,F,c8))continue;if(!S||c8.t<I.t)S=!0,I.t=c8.t,I.nx=c8.nx,I.ny=c8.ny,I.nz=c8.nz,I.solid=c8.solid}return S}function QY(U,X){var B=U.mesh.position,F=X;for(var I=0;I<3&&F>0.000001;I++){var S=U.vx*F,k=U.vy*F,b=U.vz*F;if(!S&&!k&&!b)return;if(!JY(U,S,k,b,e7)){B.x+=S,B.y+=k,B.z+=b;return}B.x+=S*e7.t,B.y+=k*e7.t,B.z+=b*e7.t,n8(U,e7.nx,e7.ny,e7.nz,e7.solid),F*=1-e7.t}}function ZY(U,X,B){$8=0;var F=z0[U._mold];if(!F)return;var I=U.mesh.position,S=Math.max(F.hw,F.hd)+Math.sqrt(X*X+B*B)+BW+0.5,k=L5(I.x,I.z,S);for(var b=0;b<k.length;b++){var e=k[b];if(e===U||!e._alive)continue;var s=z0[e._mold];if(!s||!s.solid&&!s.trigger)continue;D$[$8++]=e}}function WY(U,X,B,F){var I=z0[U._mold],S=I?I.col:null,k=S?Math.min(S.maxX-S.minX,Math.min(S.maxY-S.minY,S.maxZ-S.minZ)):C7;if(z5<k)k=z5;if(k<C7)k=C7;var b=Math.abs(X);if(Math.abs(B)>b)b=Math.abs(B);if(Math.abs(F)>b)b=Math.abs(F);var e=1+Math.floor(b/(k*0.5));return e>VW?VW:e}function KY(U){var X=U.mesh.position,B=X.y;X.y-=rU;var F=!1;for(var I=0;I<$8;I++){var S=D$[I];if(!S||!S._alive)continue;var k=z0[S._mold];if(!k||!k.solid)continue;if(FW(U,S))F=!0}if(!F)X.y=B}function LW(U,X){return U.maxX>X.minX&&U.minX<X.maxX&&U.maxY>X.minY&&U.minY<X.maxY&&U.maxZ>X.minZ&&U.minZ<X.maxZ}function UY(U){$8=0;var X=z0[U._mold];if(!X)return;var B=U.mesh.position,F=Math.max(X.hw,X.hd)+BW+0.5,I=L5(B.x,B.z,F);for(var S=0;S<I.length;S++){var k=I[S];if(k===U||!k._alive)continue;var b=z0[k._mold];if(!b||b.trigger)continue;D$[$8++]=k}}function YY(U){var X=U._inside||(U._inside=new Map);if(C$(U,v6),X.forEach(function(I,S){if(!S||!S._alive||S._gen!==I){X.delete(S);return}if(C$(S,E9),!LW(v6,E9))X.delete(S)}),!U._alive)return;UY(U),C$(U,v6);for(var B=0;B<$8;B++){var F=D$[B];if(!F||!F._alive)continue;if(C$(F,E9),!LW(v6,E9)||X.get(F)===F._gen)continue;if(X.set(F,F._gen),sU(U,F),!U._alive)return}}function qY(){if(!C9)return;for(var U in Q6){var X=z0[U];if(!X||!X.trigger)continue;var B=Q6[U].active;for(var F=B.length-1;F>=0;F--){var I=B[F];if(I&&I._alive)YY(I)}}}function XY(U,X){var B=D6[U._mold];if(B&&U.state){var F=B[U.state];if(F)RQ(F.step,U,"enquanto estiver no estado "+U.state)}if(!U._alive)return;if(U._mixer)try{U._mixer.update(X)}catch(m7){}U.stateTime+=X;for(var I=0;I<s0.length;I++){var S=s0[I];if(S.mold===U._mold&&S.state===U.state&&U.stateTime>=S.sec){if(CQ(U,S.next),!U._alive)return;break}}var k=U.mesh.position;if(U._ride)if(U._ride._alive&&U._ride._gen===U._rideGen)k.x+=U._ride._dx,k.y+=U._ride._dy,k.z+=U._ride._dz;else U._ride=null;if(!U.vx&&!U.vy&&!U.vz&&!U.gravity&&!U._ride&&U._iFrames<=0){if(U._dx=k.x-U._lx,U._dy=k.y-U._ly,U._dz=k.z-U._lz,U._lx=k.x,U._ly=k.y,U._lz=k.z,U.mesh&&U.mesh.matrixAutoUpdate)U.mesh.updateMatrix(),U.mesh.matrixAutoUpdate=!1;return}if(U.mesh&&!U.mesh.matrixAutoUpdate)U.mesh.matrixAutoUpdate=!0;var b=U.grounded;if(U.gravity)U.vy+=U.gravity*X;if(U.grounded=!1,U._ride=null,U.drag>0){var e=Math.exp(-U.drag*X);U.vx*=e,U.vz*=e}var s=U.vx*X,G0=U.vy*X,V0=U.vz*X,f0=I$&&U.body===0;if(f0&&(s||G0||V0||U.gravity)){ZY(U,s,V0);var W6=$8>0?WY(U,s,G0,V0):1;OW(U);var $6=X/W6;for(var z6=0;z6<W6;z6++)if(QY(U,$6),I$)OW(U);if(U.gravity)NW(U);if(b&&!U.grounded&&U.vy<=0&&I$)KY(U);if(U.grounded&&U._ride){var q7=z0[U._ride._mold],g6=z0[U._mold],X7=q7?q7.friction<0?0:q7.friction:0,o6=g6?g6.friction<0?1:g6.friction:1,F6=X7<o6?X7:o6;if(F6>0){var h6=Math.exp(-F6*8*X);U.vx*=h6,U.vz*=h6}}}else{if(s||G0||V0)k.x+=s,k.y+=G0,k.z+=V0;if(U.gravity)NW(U)}if(U._iFrames>0){if(U._iFrames=Math.max(0,U._iFrames-X),U.mesh.visible=U._iFrames<=0||Math.floor(U._iFrames*10)%2===0,U._iFrames<=0)U.mesh.visible=!0}U._dx=k.x-U._lx,U._dy=k.y-U._ly,U._dz=k.z-U._lz,U._lx=k.x,U._ly=k.y,U._lz=k.z,XQ(U)}function GY(){if(J7.set(0,0,-1),H0)if(H0.getWorldDirection(J7),J7.y=0,J7.lengthSq()<0.000000000001)J7.set(0,0,-1);else J7.normalize();f8.set(-J7.z,0,J7.x)}function EQ(U,X){var B=0,F=0;if(o.w||o.arrowup)B+=1;if(o.s||o.arrowdown)B-=1;if(o.d||o.arrowright)F+=1;if(o.a||o.arrowleft)F-=1;if(!B&&!F){U.vx=0,U.vz=0;return}GY();var I=J7.x*B+f8.x*F,S=J7.z*B+f8.z*F,k=Math.sqrt(I*I+S*S);if(k>0.000001)U.vx=I/k*X,U.vz=S/k*X;else U.vx=0,U.vz=0}function VY(U,X){if(!d0(U))return;EQ(U,a(X,8))}function BY(U,X){if(!d0(U))return;U.gravity=-Math.abs(a(X,20))}function HY(U,X){if(!d0(U))return;if(U.grounded)U.vy=Math.abs(a(X,8)),U.grounded=!1}function S9(){I$=!1,C9=!1,R9=!1,z5=1e9;for(var U in z0){var X=z0[U];if(X.trigger){C9=!0;continue}if(!X.solid)continue;I$=!0;var B=X.col,F=Math.min(B.maxX-B.minX,Math.min(B.maxY-B.minY,B.maxZ-B.minZ));if(F<z5)z5=F;R9=!0}}function NY(U){var X=z0[K0(U,"")];if(!X)return;X.solid=!0,X.trigger=!1,S9()}function FY(U){var X=z0[K0(U,"")];if(!X)return;X.trigger=!0,X.solid=!1,S9()}function OY(U,X){if(!d0(U))return;U.body=X===!1?0:1}function LY(U,X){var B=z0[K0(U,"")];if(B)B.bounce=Math.max(0,Math.min(1,a(X,0)))}function PY(U,X){var B=z0[K0(U,"")];if(B)B.friction=Math.max(0,Math.min(1,a(X,0)))}var PW={bola:{col:1,bounce:0.7,friction:0.4,g:20},caixa:{col:0,bounce:0.1,friction:0.7,g:20},personagem:{col:2,bounce:0,friction:0.9,g:20},gelo:{col:0,bounce:0.05,friction:0.02,g:20},flutuante:{col:1,bounce:0.3,friction:0.1,g:0}};function zY(U,X){var B=z0[K0(U,"")];if(!B)return;var F=PW[K0(X,"caixa")];if(!F)F=PW.caixa;B.col.kind=F.col,B.bounce=F.bounce,B.friction=F.friction,B.gravity=F.g,S9()}function IY(U,X){var B=z0[K0(U,"")];if(!B)return;var F=K0(X,"box");B.col.kind=F==="sphere"?1:F==="capsule"?2:0,S9()}function DY(U,X){var B=K0(U,"");if(!B||typeof X!=="function")return;if(!A6[B])A6[B]=[];A6[B].push(X)}function CY(U,X,B){if(!d0(U))return;if(!U.gravity)U.gravity=-20;if(EQ(U,a(X,8)),(o[" "]||$0[" "])&&U.grounded)U.vy=Math.abs(a(B,9)),U.grounded=!1}function RY(U,X){if(!d0(U)||!d0(X))return;var B=X.mesh.position.x-U.mesh.position.x,F=X.mesh.position.y-U.mesh.position.y,I=X.mesh.position.z-U.mesh.position.z,S=Math.sqrt(B*B+F*F+I*I);if(!(S>0.0001)){U.vx=0,U.vy=0,U.vz=0;return}var k=a(U.speed,3);U.vx=B/S*k,U.vy=F/S*k,U.vz=I/S*k}function EY(U,X,B){if(!d0(U))return;var F=a(X,0)-U.mesh.position.x,I=a(B,0)-U.mesh.position.z,S=Math.sqrt(F*F+I*I);if(!(S>0.05)){U.vx=0,U.vz=0;return}var k=a(U.speed,3);U.vx=F/S*k,U.vz=I/S*k}function SY(U,X,B){if(!d0(U)||!d0(X)||!H6)return;if(H6.copy(X.mesh.position).sub(U.mesh.position),H6.y=0,!(H6.lengthSq()>0.000001))return;H6.normalize(),P$.setFromUnitVectors(w6.set(0,0,1),H6);var F=Math.max(0.1,a(B,8)),I=1-Math.exp(-F*b0);U.mesh.quaternion.slerp(P$,I),R$(U)}function AY(U,X){if(!d0(U)||!d0(X)||!H6)return!1;if(H6.copy(X.mesh.position).sub(U.mesh.position),H6.y=0,!(H6.lengthSq()>0.000001))return!0;if(H6.normalize(),w6.set(0,0,1).applyQuaternion(U.mesh.quaternion),w6.y=0,!(w6.lengthSq()>0.000001))return!1;return w6.normalize(),H6.dot(w6)>0.999}function R$(U){if(U&&U.mesh&&U.mesh.matrixAutoUpdate===!1)U.mesh.updateMatrix()}function jY(U){if(!d0(U))return;if(Math.abs(U.vx)<0.000001&&Math.abs(U.vz)<0.000001)return;U.mesh.rotation.set(0,Math.atan2(U.vx,U.vz),0),R$(U)}function wY(U,X){if(!d0(U)||!H6)return;var B=a(X,6);H6.set(0,0,1).applyQuaternion(U.mesh.quaternion),U.vx=H6.x*B,U.vy=H6.y*B,U.vz=H6.z*B}function MY(U,X){if(!d0(U)||!d0(X))return;U.mesh.lookAt(X.mesh.position.x,U.mesh.position.y,X.mesh.position.z),R$(U)}function zW(U,X){if(!d0(U)||!d0(X))return 1/0;var B=U.mesh.position.x-X.mesh.position.x,F=U.mesh.position.y-X.mesh.position.y,I=U.mesh.position.z-X.mesh.position.z;return Math.sqrt(B*B+F*F+I*I)}function TY(U,X,B,F){if(!d0(U)||typeof F!=="function")return;var I=K0(X,""),S=Math.max(0.1,a(B,10)),k=S*S,b=Q6[I];if(!b)return;var e=L5(U.mesh.position.x,U.mesh.position.z,S),s=[];for(var G0=0;G0<e.length;G0++){var V0=e[G0];if(V0===U||!V0._alive||V0._mold!==I)continue;var f0=V0.mesh.position.x-U.mesh.position.x,W6=V0.mesh.position.y-U.mesh.position.y,$6=V0.mesh.position.z-U.mesh.position.z;if(f0*f0+W6*W6+$6*$6<=k)s.push(V0)}b._sweeping++;for(var z6=0;z6<s.length;z6++){if(!s[z6]._alive)continue;try{F(s[z6])}catch(q7){if(!F.__szg3kWarned)F.__szg3kWarned=!0,N0('erro no "para cada vizinho": '+q7)}}if(b._sweeping--,b._sweeping===0)D9(b)}function SQ(U,X,B){var F=null,I=1/0;for(var S=0;S<U.length;S++){var k=U[S];if(!k._alive||k===X||k._mold!==B)continue;var b=k.mesh.position.x-X.mesh.position.x,e=k.mesh.position.y-X.mesh.position.y,s=k.mesh.position.z-X.mesh.position.z,G0=b*b+e*e+s*s;if(G0<I)I=G0,F=k}return F}function kY(U,X){if(!d0(X))return null;var B=K0(U,""),F=Q6[B];if(!F)return null;var I=$.world/P8,S=X.mesh.position.x,k=X.mesh.position.z,b=X.mesh.position;for(var e=2;e<=P8;e+=e){var s=I*e,G0=SQ(L5(S,k,s),X,B);if(G0){var V0=G0.mesh.position.x-b.x,f0=G0.mesh.position.y-b.y,W6=G0.mesh.position.z-b.z,$6=Math.sqrt(V0*V0+f0*f0+W6*W6);if($6<=s)return G0;return SQ(L5(S,k,$6),X,B)}if(s>=$.world)break}return SQ(F.active,X,B)}function vY(U,X,B){if(!d0(U)||!d0(X))return!1;var F=Math.max(0.01,a(B,1.5));return zW(U,X)<F}function IW(U,X,B){if(!U)return;for(var F=0;F<U.length;F++){var I=U[F];try{I(X)}catch(S){if(!I.__szg3kWarned)I.__szg3kWarned=!0,N0('erro no "'+B+'": '+S)}}}function _Y(U,X){if(!d0(U))return;if(U._iFrames>0)return;if(U.health=Math.max(0,a(U.health,0)-Math.max(0,a(X,10))),U._iFrames=0.5,IW(g0[U._mold],U,"quando levar dano"),!U._alive)return;if(U.health<=0)IW(o0[U._mold],U,"quando for derrotado"),zQ(U)}function yY(U,X){if(!d0(U))return;var B=a(U.health,0)+Math.max(0,a(X,10)),F=a(U.maxHealth,0);U.health=F>0?Math.min(F,B):B}var A9=300,hY=120,xY=["attribute vec2 particleData;","varying float vLife;","varying float vId;","uniform float sizeFrom;","uniform float sizeTo;","uniform float scaleFactor;","uniform sampler2D curve;","void main() {","  vLife = particleData.x;","  vId = particleData.y;","  vec3 mv = (modelViewMatrix * vec4(position, 1.0)).xyz;","  gl_Position = projectionMatrix * vec4(mv, 1.0);","  float shape = texture2D(curve, vec2(vLife, 0.75)).r;","  float size = mix(sizeFrom, sizeTo, vLife) * shape * 2.0;","  gl_PointSize = size * scaleFactor / max(0.1, -mv.z);","}"].join(" "),bY=["uniform sampler2D map;","uniform vec3 colorFrom;","uniform vec3 colorTo;","uniform float spinSpeed;","uniform float time;","uniform float additive;","uniform sampler2D curve;","varying float vLife;","varying float vId;","void main() {","  float ang = spinSpeed * time + vId * 6.2831853;","  float c = cos(ang);","  float s = sin(ang);","  vec2 uv = gl_PointCoord.xy - 0.5;","  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;","  vec4 texel = texture2D(map, uv);","  vec3 ramp = texture2D(curve, vec2(vLife, 0.25)).rgb;","  float fade = texture2D(curve, vec2(vLife, 0.75)).g;","  vec3 col = mix(colorFrom, colorTo, vLife) * ramp * 2.0;","  float alpha = texel.a * fade;","  float addLife = texture2D(curve, vec2(vLife, 0.75)).b;","  float outA = alpha * (1.0 - additive * addLife);","  gl_FragColor = vec4(col * alpha, outA);","}"].join(" "),j9={linear:{shape:[[0,0.5],[1,0.5]],fade:[[0,1],[1,0]],tint:[[0,0.5],[1,0.5]],add:[[0,1],[1,1]]},suave:{shape:[[0,0.15],[0.3,0.5],[1,0.05]],fade:[[0,0],[0.15,1],[1,0]],tint:[[0,0.5],[1,0.5]],add:[[0,1],[1,1]]},pulso:{shape:[[0,0.6],[0.12,0.5],[1,0]],fade:[[0,1],[0.6,0.7],[1,0]],tint:[[0,0.5],[1,0.5]],add:[[0,1],[1,1]]},fogo:{shape:[[0,0.35],[0.25,0.5],[1,0.1]],fade:[[0,1],[0.7,0.5],[1,0]],tint:[[0,0.95],[0.4,0.55],[1,0.1]],add:[[0,1],[0.45,0.85],[1,0]]}},E$=32,M7=null;function fY(U){var X=K0(U,"linear");return j9[X]||j9.linear}function I5(U,X){var B=U[0];for(var F=1;F<U.length;F++){var I=U[F];if(X<=I[0]){var S=I[0]-B[0],k=S>0.00001?(X-B[0])/S:0;return B[1]+(I[1]-B[1])*k}B=I}return B[1]}function gY(U){var X=K0(U,"linear");if(!j9[X])X="linear";if(!M7)M7={};if(M7[X])return M7[X];if(!W5)return null;try{var B=j9[X],F=new Uint8Array(E$*2*4);for(var I=0;I<E$;I++){var S=E$>1?I/(E$-1):0,k=Math.max(0,Math.min(1,I5(B.tint,S))),b=Math.max(0,Math.min(1,I5(B.shape,S))),e=Math.max(0,Math.min(1,I5(B.fade,S))),s=I*4;F[s]=Math.round(k*255),F[s+1]=Math.round(k*255),F[s+2]=Math.round(k*255),F[s+3]=255;var G0=Math.max(0,Math.min(1,I5(B.add,S))),V0=(E$+I)*4;F[V0]=Math.round(b*255),F[V0+1]=Math.round(e*255),F[V0+2]=Math.round(G0*255),F[V0+3]=255}var f0=new W5(F,E$,2);if(rJ!=null)f0.format=rJ;if(s6!=null)f0.minFilter=s6,f0.magFilter=s6;if(H8!=null)f0.wrapS=H8,f0.wrapT=H8;return f0.needsUpdate=!0,M7[X]=f0,f0}catch(W6){return null}}function pY(){if(_)return _;try{var U=document.createElement("canvas");U.width=64,U.height=64;var X=U.getContext("2d");if(!X)return null;var B=X.createRadialGradient(32,32,2,32,32,30);return B.addColorStop(0,"rgba(255, 255, 255, 1)"),B.addColorStop(0.55,"rgba(255, 255, 255, 0.55)"),B.addColorStop(1,"rgba(255, 255, 255, 0)"),X.fillStyle=B,X.fillRect(0,0,64,64),_=new xJ(U),_}catch(F){return null}}function DW(U){var X=new V$,B=new Float32Array(A9*3),F=new Float32Array(A9*2),I=new B8(B,3),S=new B8(F,2);if(e5!=null)I.setUsage(e5),S.setUsage(e5);X.setAttribute("position",I),X.setAttribute("particleData",S),X.boundingSphere=new G9(new l6,1000),X.setDrawRange(0,0);var k=new P7(U.colorFrom),b=new P7(U.colorTo),e=new $Q({uniforms:{map:{value:pY()},colorFrom:{value:new l6(k.r,k.g,k.b)},colorTo:{value:new l6(b.r,b.g,b.b)},sizeFrom:{value:Math.max(0.01,U.sizeFrom)},sizeTo:{value:Math.max(0,U.sizeTo)},scaleFactor:{value:$.h*0.42},spinSpeed:{value:U.spin},time:{value:0},additive:{value:U.glow?1:0},curve:{value:gY(U.curve)}},vertexShader:xY,fragmentShader:bY,transparent:!0,depthWrite:!1,blending:gJ!=null&&Z9!=null&&W9!=null?gJ:U.glow?r1:RZ,blendSrc:Z9!=null?Z9:void 0,blendDst:W9!=null?W9:void 0}),s=new q9(X,e);s.frustumCulled=!1;var G0={count:U.count,emissionRate:U.emissionRate,life:U.life,lifeVar:U.lifeVar,speed:U.speed,speedVar:U.speedVar,cone:U.cone,volume:U.volume,gravity:U.gravity,gravityStrength:U.gravityStrength,drag:U.drag,spin:U.spin,glow:U.glow,needsSort:!U.glow||I5(fY(U.curve).add,1)<0.999,attractors:[],geometry:X,material:e,points:s,positions:B,dataArr:F,particles:[],free:[]};if(n&&U0)U0.add(s);return G0}function uY(U,X){var B=K0(U,"");if(!B){N0('"Criar o efeito 3D" precisa de um nome');return}var F=X&&typeof X==="object"?X:{},I=w0[B];if(!I&&c0>=W){m0("effect-limit","o mundo já tem "+W+" efeitos — reutilize um efeito existente");return}if(I)w9(I);try{if(w0[B]=DW({count:Math.max(1,Math.min(hY,Math.floor(a(F.count,24)))),emissionRate:0,colorFrom:K0(F.colorFrom,"#fb923c"),colorTo:K0(F.colorTo,"#451a03"),sizeFrom:a(F.sizeFrom,0.5),sizeTo:a(F.sizeTo,0),life:Math.max(0.05,a(F.life,0.8)),lifeVar:0.3,speed:Math.max(0.1,a(F.spread,6))*0.7,speedVar:0.43,cone:Math.PI,volume:0,gravity:a(F.gravity,-9),gravityStrength:1,drag:0.5,spin:0,glow:!0,curve:"pulso"}),!I)c0++;CW(I,w0[B])}catch(S){N0('não consegui criar o efeito "'+B+'": '+S)}}function lY(U,X){var B=K0(U,"");if(!B){N0('"Criar o emissor 3D" precisa de um nome');return}var F=X&&typeof X==="object"?X:{},I=w0[B];if(!I&&c0>=W){m0("effect-limit","o mundo já tem "+W+" efeitos — reutilize um efeito existente");return}if(I)w9(I);try{var S=Math.max(0,Math.min(180,a(F.cone,20))),k=F.glow==null?!0:F.glow!==!1&&F.glow!=="FALSE";if(w0[B]=DW({count:1,emissionRate:Math.max(1,a(F.rate,30)),colorFrom:K0(F.colorFrom,"#fde047"),colorTo:K0(F.colorTo,"#7f1d1d"),sizeFrom:a(F.sizeFrom,0.5),sizeTo:a(F.sizeTo,0),life:Math.max(0.05,a(F.life,1)),lifeVar:0.4,speed:Math.max(0,a(F.speed,3)),speedVar:0.3,cone:S*Math.PI/180,volume:Math.max(0,a(F.volume,0.15)),gravity:a(F.gravity,2),gravityStrength:1,drag:0.5,spin:a(F.spin,1.5),glow:k,curve:K0(F.curve,"suave")}),!I)c0++;CW(I,w0[B])}catch(b){N0('não consegui criar o emissor "'+B+'": '+b)}}function w9(U){try{if(U.points&&U.points.parent)U.points.parent.remove(U.points);if(U.geometry&&U.geometry.dispose)U.geometry.dispose();if(U.material&&U.material.dispose)U.material.dispose()}catch(X){}}function CW(U,X){if(!U||U===X)return;for(var B=0;B<X6.length;B++)if(X6[B].fx===U)X6[B].fx=X}function mY(){for(var U in w0){var X=w0[U];if(X.points&&!X.points.parent&&U0)U0.add(X.points)}}function RW(U,X,B,F){if(U.particles.length>=A9)return;var I=U.free.pop()||{x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1,id:0},S=h0()*Math.PI*2,k=h0()*Math.PI,b=h0()*U.volume;I.x=X+Math.sin(k)*Math.cos(S)*b,I.y=B+Math.cos(k)*b,I.z=F+Math.sin(k)*Math.sin(S)*b;var e=h0()*Math.PI*2,s=h0()*U.cone,G0=U.speed*(1+(h0()*2-1)*U.speedVar);if(I.vx=Math.sin(s)*Math.cos(e)*G0,I.vy=Math.cos(s)*G0,I.vz=Math.sin(s)*Math.sin(e)*G0,I.life=0,I.maxLife=U.life*(1+(h0()*2-1)*U.lifeVar),I.maxLife<0.05)I.maxLife=0.05;I.id=h0(),U.particles.push(I)}function EW(U,X,B,F){var I=w0[K0(U,"")];if(!I){N0('o efeito "'+K0(U,"")+'" não existe — crie com "Criar o efeito 3D"');return}var S=a(X,0),k=a(B,1),b=a(F,0);for(var e=0;e<I.count;e++)RW(I,S,k,b)}function dY(U,X){if(!d0(X))return;EW(U,X.mesh.position.x,X.mesh.position.y+0.5,X.mesh.position.z)}var SW=8;function AW(U,X,B){var F=0;for(var I=0;I<X6.length;I++)if(X6[I].active&&X6[I].fx===U)F++;if(F>=SW){if(!U._jetsWarned)U._jetsWarned=!0,N0('o efeito "'+X+'" já tem '+SW+" jorros ligados — desligue algum antes de ligar outro");return}X6.push(B)}function cY(U,X,B,F){var I=K0(U,""),S=w0[I];if(!S){N0('o efeito "'+I+'" não existe — crie com "Criar o emissor 3D"');return}var k=a(X,0),b=a(B,1),e=a(F,0);for(var s=0;s<X6.length;s++){var G0=X6[s];if(G0.active&&G0.fx===S&&!G0.entity&&G0.x===k&&G0.y===b&&G0.z===e)return}AW(S,I,{fx:S,entity:null,gen:0,x:k,y:b,z:e,t:0,active:!0})}function nY(U,X){var B=K0(U,""),F=w0[B];if(!F){N0('o efeito "'+B+'" não existe — crie com "Criar o emissor 3D"');return}if(!d0(X))return;for(var I=0;I<X6.length;I++){var S=X6[I];if(S.active&&S.fx===F&&S.entity===X&&S.gen===X._gen)return}AW(F,B,{fx:F,entity:X,gen:X._gen,x:0,y:0,z:0,t:0,active:!0})}function iY(U){var X=w0[K0(U,"")];if(!X)return;for(var B=0;B<X6.length;B++)if(X6[B].fx===X)X6[B].active=!1}function sY(U,X,B,F,I,S){var k=w0[K0(U,"")];if(!k)return;if(k.attractors.length>=q){m0("attractor-limit:"+K0(U,""),'o efeito "'+K0(U,"")+'" já tem '+q+" atratores — mova ou reutilize os existentes");return}k.attractors.push({x:a(X,0),y:a(B,0),z:a(F,0),intensity:a(I,20),radius:Math.max(0.1,a(S,5))})}function oY(U){for(var X=X6.length-1;X>=0;X--){var B=X6[X],F=B.fx;if(!B.active||!F||F.emissionRate<=0||B.entity&&(!B.entity._alive||B.entity._gen!==B.gen)){X6.splice(X,1);continue}var I,S,k;if(B.entity)I=B.entity.mesh.position.x,S=B.entity.mesh.position.y+0.5,k=B.entity.mesh.position.z;else I=B.x,S=B.y,k=B.z;B.t+=U;var b=1/F.emissionRate,e=0;while(B.t>=b&&e<A9)B.t-=b,RW(F,I,S,k),e++}}function aY(U){for(var X in w0){var B=w0[X],F=B.particles;if(B.material&&B.material.uniforms&&B.material.uniforms.time)B.material.uniforms.time.value=L0;if(F.length===0){if(B.geometry.drawRange&&B.geometry.drawRange.count!==0)try{B.geometry.setDrawRange(0,0)}catch(X7){}continue}var I=B.attractors,S=Math.exp(-B.drag*U);for(var k=F.length-1;k>=0;k--){var b=F[k];if(b.life+=U,b.life>=b.maxLife){var e=F.length-1;F[k]=F[e],F.pop(),B.free.push(b);continue}b.vy+=B.gravity*B.gravityStrength*U,b.vx*=S,b.vy*=S,b.vz*=S;for(var s=0;s<I.length;s++){var G0=I[s],V0=G0.x-b.x,f0=G0.y-b.y,W6=G0.z-b.z,$6=Math.sqrt(V0*V0+f0*f0+W6*W6);if($6>0.0001){var z6=$6/G0.radius,q7=G0.intensity/(1+z6*z6),g6=q7*U/$6;b.vx+=V0*g6,b.vy+=f0*g6,b.vz+=W6*g6}}b.x+=b.vx*U,b.y+=b.vy*U,b.z+=b.vz*U}rY(B)}}function rY(U){var X=U.particles;if(U.needsSort&&H0&&H0.position&&X.length>1){var B=H0.position.x,F=H0.position.y,I=H0.position.z;for(var S=0;S<X.length;S++){var k=X[S],b=k.x-B,e=k.y-F,s=k.z-I;k._sf=b*b+e*e+s*s}X.sort(tY)}for(var G0=0;G0<X.length;G0++){var V0=X[G0];U.positions[G0*3]=V0.x,U.positions[G0*3+1]=V0.y,U.positions[G0*3+2]=V0.z,U.dataArr[G0*2]=V0.maxLife>0?V0.life/V0.maxLife:1,U.dataArr[G0*2+1]=V0.id}try{U.geometry.attributes.position.needsUpdate=!0,U.geometry.attributes.particleData.needsUpdate=!0,U.geometry.setDrawRange(0,X.length)}catch(f0){}}function tY(U,X){return X._sf-U._sf}function eY(){X6.length=0;for(var U in w0){var X=w0[U];while(X.particles.length>0)X.free.push(X.particles.pop());X.attractors.length=0;try{X.geometry.setDrawRange(0,0)}catch(B){}}}var D5=4,$q=["varying vec2 vUvs;","void main() {","  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);","  vUvs = uv;","}"].join(" "),Jq=["uniform sampler2D tDiffuse;","varying vec2 vUvs;","void main() { gl_FragColor = texture2D(tDiffuse, vUvs); }"].join(" "),Qq=["uniform sampler2D frameTexture;","uniform bool useKaris;","uniform vec2 resolution;","varying vec2 vUvs;","float Luminance(vec4 c) { return max(1.0, dot(c.xyz, vec3(0.2627, 0.6780, 0.0593))); }","vec4 KarisAverage(vec4 s1, vec4 s2, vec4 s3, vec4 s4) {","  float w1 = 1.0 / Luminance(s1);","  float w2 = 1.0 / Luminance(s2);","  float w3 = 1.0 / Luminance(s3);","  float w4 = 1.0 / Luminance(s4);","  float totalWeight = 1.0 / (w1 + w2 + w3 + w4);","  return (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4) * totalWeight;","}","void main() {","  vec2 texelSize = 1.0 / resolution;","  vec4 A = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, -1.0));","  vec4 B = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, -1.0));","  vec4 C = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, -1.0));","  vec4 D = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, -0.5));","  vec4 E = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, -0.5));","  vec4 F = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 0.0));","  vec4 G = texture2D(frameTexture, vUvs);","  vec4 H = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 0.0));","  vec4 I = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, 0.5));","  vec4 J = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, 0.5));","  vec4 K = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 1.0));","  vec4 L = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, 1.0));","  vec4 M = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 1.0));","  vec2 div = vec2(0.5, 0.125);","  vec4 colour = vec4(0.0);","  if (useKaris) {","    colour = KarisAverage(D, E, I, J) * div.x;","    colour += KarisAverage(A, B, G, F) * div.y;","    colour += KarisAverage(B, C, H, G) * div.y;","    colour += KarisAverage(F, G, L, K) * div.y;","    colour += KarisAverage(G, H, M, L) * div.y;","  } else {","    div *= 0.25;","    colour = (D + E + I + J) * div.x;","    colour += (A + B + G + F) * div.y;","    colour += (B + C + H + G) * div.y;","    colour += (F + G + L + K) * div.y;","    colour += (G + H + M + L) * div.y;","  }","  gl_FragColor = colour;","}"].join(" "),Zq=["uniform sampler2D frameTexture;","uniform sampler2D mipTexture;","uniform vec2 resolution;","varying vec2 vUvs;","void main() {","  float x = 1.0 / resolution.x;","  float y = 1.0 / resolution.y;","  vec4 a = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y + y));","  vec4 b = texture2D(frameTexture, vec2(vUvs.x, vUvs.y + y));","  vec4 c = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y + y));","  vec4 d = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y));","  vec4 e = texture2D(frameTexture, vec2(vUvs.x, vUvs.y));","  vec4 f = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y));","  vec4 g = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y - y));","  vec4 h = texture2D(frameTexture, vec2(vUvs.x, vUvs.y - y));","  vec4 i = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y - y));","  vec4 colour = e * 4.0;","  colour += (b + d + f + h) * 2.0;","  colour += (a + c + g + i);","  colour *= 1.0 / 16.0;","  colour += texture2D(mipTexture, vUvs);","  gl_FragColor = colour;","}"].join(" "),Wq=["uniform sampler2D frameTexture;","uniform sampler2D bloomTexture;","uniform float bloomStrength;","uniform float bloomMix;","varying vec2 vUvs;","void main() {","  vec4 textureSample = texture2D(frameTexture, vUvs);","  vec4 bloomSample = texture2D(bloomTexture, vUvs);","  gl_FragColor = mix(textureSample, bloomStrength * bloomSample, bloomMix);","}"].join(" "),Kq=["uniform sampler2D tDiffuse;","uniform float intensity;","uniform float dropoff;","varying vec2 vUvs;","float inverseLerp(float v, float minValue, float maxValue) {","  return (v - minValue) / (maxValue - minValue);","}","float remap(float v, float inMin, float inMax, float outMin, float outMax) {","  float t = inverseLerp(v, inMin, inMax);","  return mix(outMin, outMax, t);","}","float vignette(vec2 uvs) {","  float v1 = smoothstep(0.5, 0.3, abs(uvs.x - 0.5));","  float v2 = smoothstep(0.5, 0.3, abs(uvs.y - 0.5));","  float v = v1 * v2;","  v = pow(v, dropoff);","  v = remap(v, 0.0, 1.0, intensity, 1.0);","  return v;","}","vec3 RRTAndODTFit(vec3 v) {","  vec3 a = v * (v + 0.0245786) - 0.000090537;","  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;","  return a / b;","}","vec3 aces(vec3 color) {","  mat3 mIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);","  mat3 mOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);","  color *= 1.0 / 0.6;","  color = mIn * color;","  color = RRTAndODTFit(color);","  color = mOut * color;","  return clamp(color, 0.0, 1.0);","}","void main() {","  vec4 texel = texture2D(tDiffuse, vUvs);","  vec3 col = texel.xyz * vignette(vUvs);","  col = aces(col);","  col = pow(col, vec3(0.4545));","  gl_FragColor = vec4(col, 1.0);","}"].join(" ");function AQ(U,X){return new QQ(Math.max(1,Math.round(U)),Math.max(1,Math.round(X)),{type:N8,magFilter:s6,minFilter:s6,wrapS:H8,wrapT:H8,generateMipmaps:!1,depthBuffer:!1,stencilBuffer:!1})}function C5(U,X){return new $Q({uniforms:X,vertexShader:$q,fragmentShader:U,depthTest:!1,depthWrite:!1})}function Uq(){if(C6||_6)return;try{var U=new eJ,X=new K9(-1,1,1,-1,0,1),B=new Y9(2,2),F=new O8(B,null);U.add(F);var I=new QQ($.w,$.h,{type:N8,magFilter:s6,minFilter:s6,depthBuffer:!0,stencilBuffer:!1}),S=AQ($.w,$.h),k=[null],b=[null];for(var e=1;e<=D5;e++){var s=Math.pow(2,e);k.push(AQ($.w/s,$.h/s)),b.push(AQ($.w/s,$.h/s))}var G0=C5(Jq,{tDiffuse:{value:null}}),V0=C5(Qq,{frameTexture:{value:null},useKaris:{value:!1},resolution:{value:new F$(1,1)}}),f0=C5(Zq,{frameTexture:{value:null},mipTexture:{value:null},resolution:{value:new F$(1,1)}}),W6=C5(Wq,{frameTexture:{value:null},bloomTexture:{value:null},bloomStrength:{value:$.bloomStrength},bloomMix:{value:0.08}}),$6=C5(Kq,{tDiffuse:{value:null},intensity:{value:0.35},dropoff:{value:0.35}});C6={quadScene:U,quadCam:X,quadGeo:B,quadMesh:F,rtScene:I,rtGrade:S,down:k,up:b,matCopy:G0,matDown:V0,matUp:f0,matComposite:W6,matFinal:$6}}catch(z6){_6=!0,C6=null,N0("efeitos de cinema indisponíveis neste computador — seguindo sem eles: "+z6)}}function R5(U,X){C6.quadMesh.material=U,X0.setRenderTarget(X),X0.render(C6.quadScene,C6.quadCam)}function Yq(){var U=C6;if(iJ!=null)X0.toneMapping=iJ;X0.setRenderTarget(U.rtScene),X0.render(U0,H0);var X=U.rtScene;if($.bloom){var B=U.rtScene;for(var F=1;F<=D5;F++)U.matDown.uniforms.frameTexture.value=B.texture,U.matDown.uniforms.useKaris.value=F===1,U.matDown.uniforms.resolution.value.set(B.width,B.height),R5(U.matDown,U.down[F]),B=U.down[F];U.matCopy.uniforms.tDiffuse.value=U.down[D5].texture,R5(U.matCopy,U.up[D5]);for(var I=D5-1;I>=1;I--)U.matUp.uniforms.frameTexture.value=U.up[I+1].texture,U.matUp.uniforms.mipTexture.value=U.down[I+1].texture,U.matUp.uniforms.resolution.value.set(U.up[I+1].width,U.up[I+1].height),R5(U.matUp,U.up[I]);U.matComposite.uniforms.frameTexture.value=U.rtScene.texture,U.matComposite.uniforms.bloomTexture.value=U.up[1].texture,U.matComposite.uniforms.bloomStrength.value=$.bloomStrength,R5(U.matComposite,U.rtGrade),X=U.rtGrade}U.matFinal.uniforms.tDiffuse.value=X.texture,U.matFinal.uniforms.intensity.value=$.vignette?0.35:1,R5(U.matFinal,null)}function jW(){var U=C6;if(!U)return;C6=null;try{var X=[U.rtScene,U.rtGrade].concat(U.down.slice(1)).concat(U.up.slice(1));for(var B=0;B<X.length;B++)if(X[B]&&X[B].dispose)X[B].dispose();var F=[U.matCopy,U.matDown,U.matUp,U.matComposite,U.matFinal];for(var I=0;I<F.length;I++)if(F[I]&&F[I].dispose)F[I].dispose();if(U.quadGeo&&U.quadGeo.dispose)U.quadGeo.dispose()}catch(S){}}function qq(){if(($.bloom||$.vignette)&&!_6){if(!C6)Uq();if(C6){Yq();return}}if(Q5!=null)X0.toneMapping=Q5;X0.setRenderTarget(null),X0.render(U0,H0)}var M9=0,T9=0,k9=0;function v9(){var U=v0;if(v0=null,U!==null&&u&&u.releasePointerCapture)try{if(!u.hasPointerCapture||u.hasPointerCapture(U))u.releasePointerCapture(U)}catch(X){m0("fps-touch-release","não consegui liberar o gesto da câmera: "+X)}if(typeof document<"u"&&document.pointerLockElement===u&&document.exitPointerLock)try{document.exitPointerLock()}catch(X){m0("fps-pointer-unlock","não consegui liberar o cursor da câmera: "+X)}}function _9(U){if(R0.kind==="fps"&&U.kind!=="fps")v9();R0=U}function y9(U){if(_9({kind:"orbit",target:null,targetGen:0,dist:Math.max(2,a(U,25)),height:0,pivot:R0.pivot,pivotGen:R0.pivotGen}),!T6){var X={az:0.7,el:0.5,dist:R0.dist,dragging:!1,px:0,py:0};if(T6=X,u&&u.addEventListener)u.addEventListener("pointerdown",function(B){p9(),X.dragging=!0,X.px=B.clientX||0,X.py=B.clientY||0}),u.addEventListener("wheel",function(B){if(R0.kind!=="orbit")return;if(X.dist+=B.deltaY>0?2:-2,X.dist<3)X.dist=3;if(X.dist>$.world*2)X.dist=$.world*2}),window.addEventListener("pointermove",function(B){if(!X.dragging||R0.kind!=="orbit")return;var F=B.clientX||0,I=B.clientY||0;if(X.az-=(F-X.px)*0.01,X.el+=(I-X.py)*0.01,X.el>1.4)X.el=1.4;if(X.el<0.08)X.el=0.08;X.px=F,X.py=I}),window.addEventListener("pointerup",function(){X.dragging=!1})}T6.dist=R0.dist}function Xq(U,X){if(!T6)y9(R0.dist);if(!T6)return;T6.az=a(U,40)*Math.PI/180;var B=a(X,28)*Math.PI/180;if(B>1.4)B=1.4;if(B<0.08)B=0.08;T6.el=B}function Gq(U){var X=Math.max(1,a(U,25));if(R0.dist=X,T6)T6.dist=X}function Vq(U,X){L$=Math.max(0,a(U,0.5)),$7=Math.max(0,a(X,0.3)),N5=$7||1}function Bq(U){if(!H0)return;if(H0.fov=Math.max(15,Math.min(120,a(U,60))),H0.updateProjectionMatrix)H0.updateProjectionMatrix()}function Hq(U){if(d0(U)){R0.pivot=U,R0.pivotGen=U._gen;return}R0.pivot=null}function Nq(U,X,B){R0.pivot={x:a(U,0),y:a(X,0),z:a(B,0)}}function Fq(U){z7=Math.max(0.1,a(U,3))}function jQ(U,X){return d0(U)&&U._gen===X}function wW(U){var X=R0.pivot;if(X&&X.mesh){if(jQ(X,R0.pivotGen)){U.set(X.mesh.position.x,X.mesh.position.y,X.mesh.position.z);return}R0.pivot=null,U.set(0,0,0);return}if(X){U.set(X.x,X.y,X.z);return}U.set(0,0,0)}function h9(U){if(U<=0||$7<=0)return;if($7-=U,$7<0)$7=0;var X=L$*($7/N5);M9=(h0()*2-1)*X,T9=(h0()*2-1)*X,k9=(h0()*2-1)*X,H0.position.x+=M9,H0.position.y+=T9,H0.position.z+=k9}function wQ(){if(r)return!0;if(!tJ||!l6)return!1;return r=new tJ,!0}function x9(){if(k0)return;k0=!0,t={x:0,y:0};var U=function(X){var B=u&&u.getBoundingClientRect?u.getBoundingClientRect():{left:0,top:0,width:1,height:1},F=typeof X.clientX==="number"?X.clientX:0,I=typeof X.clientY==="number"?X.clientY:0;t.x=(F-B.left)/(B.width||1)*2-1,t.y=-((I-B.top)/(B.height||1))*2+1};if(u&&u.addEventListener)u.addEventListener("pointermove",U),u.addEventListener("pointerdown",U)}function Oq(U){var X=U;while(X){if(X.userData&&X.userData.szEntity&&X.userData.szEntity._alive===!0)return X.userData.szEntity;X=X.parent}return null}function MQ(){if(H0&&H0.updateMatrixWorld)H0.updateMatrixWorld();if(U0&&U0.updateMatrixWorld)U0.updateMatrixWorld(!0)}function Lq(U){if(!n||!H0||!wQ())return null;x9(),MQ(),r.setFromCamera(t,H0);var X=r.intersectObjects(U0.children,!0),B=K0(U,"");for(var F=0;F<X.length;F++){var I=Oq(X[F].object);if(I&&(!B||I._mold===B))return I}return null}function Pq(U){if(!d0(U)||!n||!H0||!wQ())return!1;x9(),MQ(),r.setFromCamera(t,H0);var X=r.intersectObjects([U.mesh],!0);return X.length>0}function zq(U){if(!n||!H0||!wQ())return 0;x9(),MQ(),r.setFromCamera(t,H0);var X=r.ray&&r.ray.origin,B=r.ray&&r.ray.direction;if(!X||!B||Math.abs(B.y)<0.000001)return 0;var F=-X.y/B.y;if(F<0)return 0;var I=K0(U,"x");if(I==="y")return X.y+B.y*F;if(I==="z")return X.z+B.z*F;return X.x+B.x*F}function Iq(U,X){if(!d0(U)){N0('"Câmera em 1ª pessoa" precisa de uma entidade');return}var B=a(X,1.4);_9({kind:"fps",target:U,targetGen:U._gen,dist:0,height:B,pivot:null,pivotGen:0,yaw:U.mesh?U.mesh.rotation.y:0,pitch:0}),Dq()}function MW(U,X){if(R0.kind!=="fps")return;if(R0.yaw-=a(U,0)*0.0025,R0.pitch-=a(X,0)*0.0025,R0.pitch>1.4)R0.pitch=1.4;if(R0.pitch<-1.4)R0.pitch=-1.4;if(d0(R0.target)&&R0.target.mesh)R0.target.mesh.rotation.y=R0.yaw,R$(R0.target)}function Dq(){if(p0)return;if(p0=!0,u&&u.addEventListener)u.style.touchAction="none",u.addEventListener("click",function(){if(R0.kind==="fps"&&u.requestPointerLock)try{u.requestPointerLock()}catch(X){}}),u.addEventListener("pointerdown",function(X){if(R0.kind!=="fps"||X.pointerType==="mouse")return;if(v0=X.pointerId,i0=X.clientX,r0=X.clientY,u.setPointerCapture)try{u.setPointerCapture(X.pointerId)}catch(B){m0("fps-touch-capture","não consegui capturar o gesto de câmera: "+B)}if(X.cancelable)X.preventDefault()});window.addEventListener("mousemove",function(X){if(R0.kind!=="fps")return;if(typeof document<"u"&&document.pointerLockElement!==u)return;MW(X.movementX||0,X.movementY||0)}),window.addEventListener("pointermove",function(X){if(v0===null||X.pointerId!==v0)return;var B=X.clientX-i0,F=X.clientY-r0;if(i0=X.clientX,r0=X.clientY,MW(B,F),X.cancelable)X.preventDefault()});var U=function(X){if(v0===null||X.pointerId!==v0)return;v0=null};window.addEventListener("pointerup",U),window.addEventListener("pointercancel",U)}function Cq(U,X){if(!d0(U))return;EQ(U,a(X,6))}function TW(U){if(!H0)return;if(H0.position.x-=M9,H0.position.y-=T9,H0.position.z-=k9,M9=0,T9=0,k9=0,R0.kind==="fps"){var X=R0.target;if(!jQ(X,R0.targetGen)){y9(R0.dist||25);return}var B=X.mesh.position.x,F=X.mesh.position.y+R0.height,I=X.mesh.position.z;H0.position.set(B,F,I);var S=Math.cos(R0.pitch);H0.lookAt(B+Math.sin(R0.yaw)*S,F+Math.sin(R0.pitch),I+Math.cos(R0.yaw)*S),h9(U);return}if(R0.kind==="orbit"&&T6){var k=Math.cos(T6.el);wW(w6),H0.position.set(w6.x+T6.dist*k*Math.sin(T6.az),w6.y+T6.dist*Math.sin(T6.el),w6.z+T6.dist*k*Math.cos(T6.az)),H0.lookAt(w6.x,w6.y,w6.z),h9(U);return}if(R0.kind==="top"){wW(w6),H0.position.set(w6.x,w6.y+R0.height,w6.z+R0.height*0.001+0.01),H0.lookAt(w6.x,w6.y,w6.z),h9(U);return}if(R0.kind==="follow"){var b=R0.target;if(!jQ(b,R0.targetGen))return;if(H6.set(0,0,1).applyQuaternion(b.mesh.quaternion),H6.y=0,!(H6.lengthSq()>0.000001))H6.set(0,0,1);H6.normalize(),w6.copy(b.mesh.position).addScaledVector(H6,-R0.dist),w6.y=b.mesh.position.y+R0.height;var e=1-Math.exp(-z7*(U>0?U:0.016));H0.position.lerp(w6,e),H0.lookAt(b.mesh.position.x,b.mesh.position.y+1,b.mesh.position.z),h9(U)}}function kW(U,X,B){for(var F=0;F<U.length;F++){var I=U[F];try{I(X)}catch(S){if(!I.__szg3kWarned)I.__szg3kWarned=!0,N0('erro no "'+B+'": '+S)}}}var b9=0;function Rq(U){var X=typeof U==="number"?U:0,B=b9?(X-b9)/1000:0;if(b9=X,!(B>=0))B=0;if(B>0.03333333333333333)B=0.03333333333333333;if(b0=B,p==="jogando"){try{Eq(B)}catch(F){if(!n0)n0=!0,N0("erro nos sistemas do jogo: "+F)}if(p==="jogando")kW(J0,B,"A cada quadro")}TW(p==="jogando"?B:0),jq(p==="pausado"?0:B),kq();try{qq()}catch(F){N0("erro ao desenhar o mundo: "+F),X0.setAnimationLoop(null)}$0={},O0=!1}function Eq(U){L0+=U,fq(U);for(var X=0;X<x.length;X++){var B=x[X];B.timer+=U;while(B.timer>=B.interval&&B.interval>0)B.timer-=B.interval,dU(B)}if(R9)TQ(U,1),TQ(U,2);else TQ(U,0);qY(),oY(U),aY(U),DU(U)}function TQ(U,X){for(var B in Q6){if(X){var F=z0[B],I=!!(F&&F.solid);if(X===1&&!I)continue;if(X===2&&I)continue}var S=Q6[B];S._sweeping++;for(var k=S.active.length-1;k>=0;k--){var b=S.active[k];if(!b||!b._alive)continue;XY(b,U)}if(S._sweeping--,S._sweeping===0)D9(S)}}var Z7=[];function Sq(U,X,B){if(!d0(U)||!p6())return;vW(U);var F=document.createElement("div");F.className="szg3k-say",F.textContent=K0(X,""),F.setAttribute("role","status"),F.setAttribute("aria-live","polite"),F.setAttribute("aria-atomic","true"),F.setAttribute("aria-label","Fala de "+K0(U._mold,"personagem")),B0.appendChild(F),Z7.push({e:U,gen:U._gen,el:F,left:Math.max(0.1,a(B,2))})}function vW(U){for(var X=Z7.length-1;X>=0;X--){if(Z7[X].e!==U)continue;if(Z7[X].el.parentNode)Z7[X].el.parentNode.removeChild(Z7[X].el);Z7.splice(X,1)}}function Aq(){for(var U=0;U<Z7.length;U++)if(Z7[U].el.parentNode)Z7[U].el.parentNode.removeChild(Z7[U].el);Z7.length=0}function jq(U){if(!Z7.length||!H0||!u)return;var X=null;for(var B=Z7.length-1;B>=0;B--){var F=Z7[B];if(F.left-=U,F.left<=0||!F.e._alive||F.e._gen!==F.gen){if(F.el.parentNode)F.el.parentNode.removeChild(F.el);Z7.splice(B,1);continue}if(X=z0[F.e._mold],H6.set(F.e.mesh.position.x,F.e.mesh.position.y+(X?X.top:1)+0.4,F.e.mesh.position.z),H6.project(H0),H6.z>1){F.el.style.display="none";continue}F.el.style.display="",F.el.style.left=(H6.x*0.5+0.5)*100+"%",F.el.style.top=(-H6.y*0.5+0.5)*100+"%"}}var T7=[];function wq(U,X){var B=z0[K0(U,"")];if(!B)return;B.healthBar=X!==!1}function Mq(){for(var U=0;U<T7.length;U++)if(T7[U].el.parentNode)T7[U].el.parentNode.removeChild(T7[U].el);T7.length=0}function Tq(U){var X=document.createElement("div");X.className="szg3k-bar",X.setAttribute("role","progressbar"),X.setAttribute("aria-label","Vida de "+K0(U._mold,"personagem")),X.setAttribute("aria-valuemin","0"),X.setAttribute("aria-valuemax",String(Math.max(0,a(U.maxHealth,0)))),X.setAttribute("aria-valuenow",String(Math.max(0,a(U.health,0))));var B=document.createElement("i");X.appendChild(B),B0.appendChild(X),T7.push({e:U,gen:U._gen,el:X,fill:B,pct:-1}),U._barGen=U._gen}function kq(){if(!m||!H0)return;for(var U in Q6){var X=z0[U];if(!X||!X.healthBar)continue;var B=Q6[U].active;for(var F=0;F<B.length;F++){var I=B[F];if(I&&I._alive&&I._barGen!==I._gen)Tq(I)}}if(!T7.length)return;for(var S=T7.length-1;S>=0;S--){var k=T7[S],b=z0[k.e._mold];if(!k.e._alive||k.e._gen!==k.gen||!b||!b.healthBar){if(k.el.parentNode)k.el.parentNode.removeChild(k.el);T7.splice(S,1);continue}var e=k.e.maxHealth>0?k.e.health/k.e.maxHealth:0;if(e<0)e=0;if(e>1)e=1;var s=Math.round(e*100);if(s!==k.pct)k.pct=s,k.fill.style.width=s+"%",k.fill.style.background=e>0.5?"#4ade80":e>0.25?"#fbbf24":"#f87171",k.el.setAttribute("aria-valuemax",String(Math.max(0,a(k.e.maxHealth,0)))),k.el.setAttribute("aria-valuenow",String(Math.max(0,a(k.e.health,0))));if(H6.set(k.e.mesh.position.x,k.e.mesh.position.y+(b.top||1)+0.15,k.e.mesh.position.z),H6.project(H0),H6.z>1){k.el.style.display="none";continue}k.el.style.display="",k.el.style.left=(H6.x*0.5+0.5)*100+"%",k.el.style.top=(-H6.y*0.5+0.5)*100+"%"}}function vq(U,X){var B=a(U,0),F=a(X,1);if(B>F){var I=B;B=F,F=I}return B+h0()*(F-B)}function _q(U){return h0()*100<a(U,50)}var R7={left:0,on:!1},kQ=[];function yq(U){R7.left=Math.max(0,a(U,30)),R7.on=R7.left>0}function hq(){return R7.left}function xq(){R7.on=!1}function bq(U){if(typeof U==="function")kQ.push(U)}function fq(U){if(!R7.on)return;if(R7.left-=U,R7.left>0)return;R7.left=0,R7.on=!1,kW(kQ,0,"quando o tempo acabar")}function gq(U,X){var B=K0(U,"");if(!B||typeof X!=="function")return;(y0[B]||(y0[B]=[])).push(X)}function pq(U){var X=y0[K0(U,"")];if(!X)return;var B=Array.prototype.slice.call(arguments,1);for(var F=0;F<X.length;F++)try{X[F].apply(null,B)}catch(I){N0('erro no "quando chegar o aviso": '+I)}}function uq(U,X){var B=K0(U,"")||K0(X,"");if(!B){N0('"Carregar o som" precisa de um nome');return}var F=K0(X,""),I=UQ[F]||(F.indexOf("data:audio/")===0?F:null);if(!I){N0('o som "'+F+'" não está no projeto. Importe em "Sons", no menu ⋯');return}if(S0[B]&&A0[B]===I)return;_W(B,!0),F0.push(new Promise(function(S){var k=null,b=!1,e=null,s=function(){if(e!==null)clearTimeout(e),e=null;if(k)k.oncanplaythrough=null,k.onerror=null;if(l0[B]===s)delete l0[B];if(!b)b=!0,S()};try{e=setTimeout(s,3000),k=new Audio,k.preload="auto",k.oncanplaythrough=s,k.onerror=function(){N0('o som "'+B+'" falhou ao carregar'),s()},k.src=I,S0[B]=k,A0[B]=I,l0[B]=s}catch(G0){s(),m0("sound-load:"+B,'não consegui preparar o som "'+B+'": '+G0)}}))}function lq(U){if(!U)return;try{U.pause()}catch(X){m0("sound-pause","não consegui pausar um efeito: "+X)}try{U.currentTime=0}catch(X){m0("sound-rewind","não consegui reiniciar um efeito: "+X)}}function _W(U,X){var B=l0[U];if(B)B(),delete l0[U];if(lq(S0[U]),!X)return;delete S0[U],delete A0[U]}function yW(U){for(var X in S0)_W(X,U)}function mq(U){var X=S0[K0(U,"")];if(!X)return;try{X.currentTime=0;var B=X.play();if(B&&B.catch)B.catch(function(){})}catch(F){}}var I8=null,f9="";function dq(U){var X=K0(U,""),B=S0[X];if(!B){m0("mus:"+X,'a música "'+X+'" não está no projeto. Importe em "Sons", no menu ⋯');return}if(f9===X&&I8)return;g9();try{I8=new Audio(B.src),f9=X,I8.loop=!0;var F=I8.play();if(F&&F.catch)F.catch(function(){})}catch(I){I8=null,f9=""}}function g9(){if(I8)try{I8.pause()}catch(U){}I8=null,f9=""}var u7=null,i8=[];function cq(){if(u7)return u7;try{var U=window.AudioContext||window.webkitAudioContext;if(U)u7=new U}catch(X){u7=null}return u7}function p9(){try{if(u7&&u7.state==="suspended")u7.resume()}catch(U){}}function hW(U){var X=i8.indexOf(U);if(X>-1)i8.splice(X,1);try{if(U.osc.disconnect)U.osc.disconnect()}catch(B){m0("tone-disconnect","não consegui liberar uma voz do sintetizador: "+B)}try{if(U.gain.disconnect)U.gain.disconnect()}catch(B){m0("tone-disconnect","não consegui liberar uma voz do sintetizador: "+B)}}function vQ(U){if(!U||U.stopped)return;U.stopped=!0,U.osc.onended=null;try{U.osc.stop()}catch(X){m0("tone-stop","não consegui parar uma voz do sintetizador: "+X)}hW(U)}function nq(){while(i8.length)vQ(i8[0])}function xW(){var U=u7;if(nq(),u7=null,!U||!U.close)return;try{var X=U.close();if(X&&X.catch)X.catch(function(B){m0("audio-close","não consegui encerrar o sintetizador: "+B)})}catch(B){m0("audio-close","não consegui encerrar o sintetizador: "+B)}}function iq(){g9(),yW(!1),xW()}function sq(){g9(),yW(!0),xW()}function bW(U,X){var B=cq();if(!B)return;try{if(B.state==="suspended")B.resume()}catch(b){}var F=null;try{if(i8.length>=R)vQ(i8[0]);var I=B.createOscillator(),S=B.createGain();I.type="square",I.frequency.value=Math.max(v,Math.min(g,a(U,440))),S.gain.value=0.06,I.connect(S),S.connect(B.destination);var k=Math.max(0.01,Math.min(y,a(X,200)/1000));F={osc:I,gain:S,stopped:!1},I.onended=function(){hW(F)},i8.push(F),I.start(),S.gain.setTargetAtTime(0,B.currentTime+k*0.6,0.05),I.stop(B.currentTime+k)}catch(b){if(F)vQ(F);m0("tone-play","não consegui tocar uma nota do sintetizador: "+b)}}var fW={coin:[880,90],hit:[180,80],explosion:[90,260],jump:[520,120],laser:[1200,90],hurt:[140,160],powerup:[700,200],win:[990,300],gameover:[120,400],click:[440,50]};function gW(U){var X=fW[K0(U,"")]||fW.hit;bW(X[0],X[1])}function pW(){if(W7)return;if(h){N0("o jogo já começou automaticamente — o bloco antigo de início não é mais necessário");return}if(!p6()){try{document.addEventListener("DOMContentLoaded",function(){pW()})}catch(X){}return}if(!QU())return;mY(),h=!0,JU(),sZ(),window.addEventListener("resize",function(){sZ()}),l8("carregando");var U=l;Promise.all(F0.slice()).then(function(){if(W7||U!==l||!X0)return;l8("menu"),b9=0,X0.setAnimationLoop(Rq)},function(X){if(!W7&&U===l)N0("não consegui concluir o carregamento do jogo: "+X)})}var W7=!1;function _Q(){if(W7)return;W7=!0,l++,BU();try{if(v9(),sq(),dZ(),X0){X0.setAnimationLoop(null);try{X0.dispose()}catch(G0){}try{X0.forceContextLoss()}catch(G0){}}var U={geometries:new Set,materials:new Set,textures:new Set,skeletons:new Set};if(U0&&U0.traverse)U0.traverse(function(G0){if(G0.geometry&&G0.geometry.dispose&&!U.geometries.has(G0.geometry)){U.geometries.add(G0.geometry);try{G0.geometry.dispose()}catch(W6){}}if(G0.material){var V0=G0.material;if(V0.length){for(var f0=0;f0<V0.length;f0++)if(V0[f0]&&V0[f0].dispose&&!U.materials.has(V0[f0])){U.materials.add(V0[f0]);try{V0[f0].dispose()}catch(W6){}}}else if(V0.dispose&&!U.materials.has(V0)){U.materials.add(V0);try{V0.dispose()}catch(W6){}}}});if(LQ(),U0&&U0.background&&U0.background.isTexture)z8(U0.background,"dispose-sky"),U0.background=null;if(PQ(),t7){for(var X in t7)z8(t7[X],"dispose-hdr-cache");t7=null}ZW(U),PU(U),L9++;var B=U.materials;for(var F in z0)YQ(z0[F],B);if(r7){for(var I in r7){var S=r7[I];if(S&&S.dispose&&!U.geometries.has(S)){U.geometries.add(S);try{S.dispose()}catch(G0){}}}r7=null}for(var k in w0)w9(w0[k]);if(_&&_.dispose)try{_.dispose()}catch(G0){}_=null;for(var b=0;b<f.length;b++)if(f[b]&&f[b].dispose)try{f[b].dispose()}catch(G0){}if(f.length=0,c){for(var e in c)if(c[e]&&c[e].dispose)try{c[e].dispose()}catch(G0){}c=null}if(M7){for(var s in M7)if(M7[s]&&M7[s].dispose)try{M7[s].dispose()}catch(G0){}M7=null}if(jW(),E&&E.parentNode)try{E.parentNode.removeChild(E)}catch(G0){}if(W0&&W0.parentNode)try{W0.parentNode.removeChild(W0)}catch(G0){}}catch(G0){}X0=null,U0=null,H0=null,r=null,X6.length=0,g8=Object.create(null),T7.length=0}window.addEventListener("pagehide",_Q),window.addEventListener("beforeunload",_Q);function Z0(U,X){return function(){try{return X.apply(null,arguments)}catch(B){N0('erro em "'+U+'": '+B);return}}}var l7={setup:Z0("setup",function(U){var X=U&&typeof U==="object"?U:{};if(h){if(!t0)N0('"Preparar o jogo 3D" depois de começar não muda o mundo — deixe-o no comecinho');return}var B=oZ(Math.max(64,Math.min(4096,a(X.width,$.w))),Math.max(64,Math.min(4096,a(X.height,$.h))),4096);if($.w=B.w,$.h=B.h,$.world=Math.max(20,Math.min(1000,a(X.world,$.world))),X.sky!=null)$.sky=K0(X.sky,$.sky);if(X.ground!=null)$.ground=K0(X.ground,$.ground);R0.dist=Math.max(6,$.world*0.35)}),start:Z0("start",pW),worldSize:Z0("worldSize",function(){return $.world}),scatterDecor:Z0("scatterDecor",YU),setEffects:Z0("setEffects",function(U){var X=U&&typeof U==="object"?U:{};if(X.shadows!=null){if($.shadows=X.shadows!==!1,X0&&X0.shadowMap)X0.shadowMap.enabled=$.shadows}if(X.bloom!=null)$.bloom=X.bloom!==!1;if(X.strength!=null)$.bloomStrength=Math.max(0,Math.min(4,a(X.strength,1.2)));if(X.vignette!=null)$.vignette=X.vignette!==!1;if(!$.bloom&&!$.vignette&&C6)jW()}),defineMold:Z0("defineMold",jU),part:Z0("part",XW),spawn:Z0("spawn",I9),spawnFrom:Z0("spawnFrom",hU),spawnRing:Z0("spawnRing",xU),startSpawner:Z0("startSpawner",lU),stopSpawner:Z0("stopSpawner",mU),forEachAlive:Z0("forEachAlive",gU),countAlive:Z0("countAlive",pU),recycle:Z0("recycle",zQ),recycleAll:Z0("recycleAll",fU),cullFar:Z0("cullFar",uU),onUpdate:Z0("onUpdate",function(U){if(typeof U==="function")J0.push(U)}),moveWithKeys:Z0("moveWithKeys",VY),keyDown:Z0("keyDown",function(U){return o[k6(U)]===!0}),keyPressed:Z0("keyPressed",function(U){return $0[k6(U)]===!0}),mouseDown:Z0("mouseDown",function(){return i}),mousePressed:Z0("mousePressed",function(){return O0}),setPauseKey:Z0("setPauseKey",function(U){var X=k6(U);if(X)$.pauseKey=X}),cameraFollow:Z0("cameraFollow",function(U,X,B){if(!d0(U)){N0('"Câmera: seguir" precisa de uma entidade');return}_9({kind:"follow",target:U,targetGen:U._gen,dist:Math.max(1,a(X,8)),height:a(B,4),pivot:R0.pivot,pivotGen:R0.pivotGen})}),cameraOrbit:Z0("cameraOrbit",function(U){y9(U)}),cameraAngle:Z0("cameraAngle",Xq),cameraDistance:Z0("cameraDistance",Gq),cameraShake:Z0("cameraShake",Vq),cameraLens:Z0("cameraLens",Bq),cameraLookAt:Z0("cameraLookAt",Hq),cameraLookAtPoint:Z0("cameraLookAtPoint",Nq),cameraSmooth:Z0("cameraSmooth",Fq),cameraTop:Z0("cameraTop",function(U){_9({kind:"top",target:null,targetGen:0,dist:0,height:Math.max(4,a(U,40)),pivot:R0.pivot,pivotGen:R0.pivotGen})}),place:Z0("place",function(U,X,B,F){if(!d0(U))return;U.mesh.position.set(a(X,0),a(B,0),a(F,0)),R$(U),XQ(U)}),setYaw:Z0("setYaw",function(U,X){if(!d0(U))return;U.mesh.rotation.set(0,a(X,0)*Math.PI/180,0),R$(U)}),setVelocity:Z0("setVelocity",function(U,X,B,F){if(!d0(U))return;U.vx=a(X,0),U.vy=a(B,0),U.vz=a(F,0)}),setDrag:Z0("setDrag",function(U,X){if(!d0(U))return;U.drag=Math.max(0,a(X,3))}),lookAt:Z0("lookAt",MY),moveForward:Z0("moveForward",wY),fall:Z0("fall",BY),jump:Z0("jump",HY),onGround:Z0("onGround",function(U){return d0(U)&&U.grounded===!0}),makeSolid:Z0("makeSolid",NY),platformerKeys:Z0("platformerKeys",CY),setSeed:Z0("setSeed",y6),randomBetween:Z0("randomBetween",vq),randomChance:Z0("randomChance",_q),playMusic:Z0("playMusic",dq),stopMusic:Z0("stopMusic",g9),startTimer:Z0("startTimer",yq),timeLeft:Z0("timeLeft",hq),stopTimer:Z0("stopTimer",xq),onTimerEnd:Z0("onTimerEnd",bq),say:Z0("say",Sq),hideSay:Z0("hideSay",vW),playAnim:Z0("playAnim",function(U,X,B){WW(U,X,B!==!1)}),stopAnim:Z0("stopAnim",OQ),setStateAnim:Z0("setStateAnim",iU),setPhysics:Z0("setPhysics",zY),setCollider:Z0("setCollider",IY),passThrough:Z0("passThrough",OY),showHealthBar:Z0("showHealthBar",wq),makeTrigger:Z0("makeTrigger",FY),onOverlap:Z0("onOverlap",DY),setBounce:Z0("setBounce",LY),setFriction:Z0("setFriction",PY),addLight:Z0("addLight",ZU),setFog:Z0("setFog",WU),setSky:Z0("setSky",KU),setSkyPhoto:Z0("setSkyPhoto",SU),setAmbient:Z0("setAmbient",UU),pick:Z0("pick",Lq),pointerOver:Z0("pointerOver",Pq),groundPoint:Z0("groundPoint",zq),cameraFps:Z0("cameraFps",Iq),moveFps:Z0("moveFps",Cq),posOf:Z0("posOf",function(U,X){var B=K0(X,"x");if(B!=="x"&&B!=="y"&&B!=="z")B="x";return d8(U,B)}),exists:Z0("exists",function(U){return d0(U)}),isMold:Z0("isMold",bU),velocityOf:Z0("velocityOf",function(U,X){if(!d0(U))return 0;var B=K0(X,"x");return B==="y"?U.vy:B==="z"?U.vz:U.vx}),distanceBetween:Z0("distanceBetween",function(U,X){if(!d0(U)||!d0(X))return 0;return zW(U,X)}),maxHealthOf:Z0("maxHealthOf",function(U){return d0(U)?U.maxHealth:0}),stateOf:Z0("stateOf",function(U){return d0(U)?U.state:""}),setEntityValue:Z0("setEntityValue",function(U,X,B){if(!d0(U))return;if(!U.data)U.data={};U.data[K0(X,"")]=B}),entityValue:Z0("entityValue",function(U,X){if(!d0(U)||!U.data)return;return U.data[K0(X,"")]}),stateTime:Z0("stateTime",function(U){return d0(U)?a(U.stateTime,0):0}),onEnterEntityState:Z0("onEnterEntityState",function(U,X,B){var F=DQ(U,X);if(F&&typeof B==="function")F.enter.push(B)}),onEntityStateUpdate:Z0("onEntityStateUpdate",function(U,X,B){var F=DQ(U,X);if(F&&typeof B==="function")F.step.push(B)}),onExitEntityState:Z0("onExitEntityState",function(U,X,B){var F=DQ(U,X);if(F&&typeof B==="function")F.exit.push(B)}),setEntityState:Z0("setEntityState",CQ),entityStateIs:Z0("entityStateIs",function(U,X){return d0(U)&&U.state===K0(X,"")}),stateTimer:Z0("stateTimer",oU),seek:Z0("seek",RY),seekPoint:Z0("seekPoint",EY),aimAt:Z0("aimAt",SY),faceVelocity:Z0("faceVelocity",jY),isAimingAt:Z0("isAimingAt",AY),forEachNear:Z0("forEachNear",TY),nearest:Z0("nearest",kY),touches:Z0("touches",vY),hurt:Z0("hurt",_Y),heal:Z0("heal",yY),healthOf:Z0("healthOf",function(U){return d0(U)?a(U.health,0):0}),onEntityDeath:Z0("onEntityDeath",function(U,X){var B=K0(U,"");if(!B||typeof X!=="function")return;(o0[B]||(o0[B]=[])).push(X)}),onHurt:Z0("onHurt",function(U,X){var B=K0(U,"");if(!B||typeof X!=="function")return;(g0[B]||(g0[B]=[])).push(X)}),setScreenText:Z0("setScreenText",function(U,X,B,F){if(!p6())return;var I=O6[K0(U,"")];if(!I){N0('tela pronta desconhecida: "'+K0(U,"")+'" (use menu, pausa, carregando, fim ou vitoria)');return}var S=K0(X,""),k=K0(B,""),b=K0(F,"");if(S)I.title.textContent=S;if(k)I.text.textContent=k;if(b&&I.mainBtn)I.mainBtn.textContent=b}),createScreen:Z0("createScreen",function(U,X,B){if(!p6())return;var F=K0(U,"");if(!F){N0('"Criar a tela" precisa de um nome');return}if(O6[F]){var I=O6[F],S=I.el.querySelectorAll("button");for(var k=0;k<S.length;k++)I.el.removeChild(S[k]);I.mainBtn=null,I.title.textContent=K0(X,F),I.text.textContent=K0(B,"");return}d6(F,"h2",K0(X,F),K0(B,""))}),addButton:Z0("addButton",function(U,X,B){if(!p6())return;var F=O6[K0(U,"")];if(!F){N0('a tela "'+K0(U,"")+'" não existe — crie-a antes de pôr o botão');return}var I=b6(F,K0(X,"Botão"),typeof B==="function"?B:function(){});B6.push(I)}),showScreen:Z0("showScreen",F7),hideScreens:Z0("hideScreens",u8),setHud:Z0("setHud",r3),setState:Z0("setState",l8),onEnterState:Z0("onEnterState",function(U,X){var B=K0(U,"");if(!B||typeof X!=="function")return;(I0[B]||(I0[B]=[])).push(X)}),stateIs:Z0("stateIs",function(U){return p===K0(U,"")}),state:Z0("state",function(){return p}),returnToMenu:Z0("returnToMenu",function(){l8("menu")}),endGame:Z0("endGame",function(){l8("fim")}),defineEffect:Z0("defineEffect",uY),burstAt:Z0("burstAt",EW),burstOn:Z0("burstOn",dY),defineEmitter:Z0("defineEmitter",lY),startEmitter:Z0("startEmitter",cY),emitterOn:Z0("emitterOn",nY),stopEmitter:Z0("stopEmitter",iY),addAttractor:Z0("addAttractor",sY),on:Z0("on",gq),emit:Z0("emit",pq),loadSound:Z0("loadSound",uq),playSound:Z0("playSound",mq),playEffect:Z0("playEffect",gW),playTone:Z0("playTone",bW)};Object.defineProperty(l7,"runProject",{value:Z0("runProject",$U),enumerable:!1}),Object.defineProperty(l7,"disposeAll",{value:Z0("disposeAll",_Q),enumerable:!1}),window.SZGameKit3D=l7})();
