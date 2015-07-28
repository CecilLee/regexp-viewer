(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 *
 * 对javascript中function类型进行增强
 *
 *  在javascript中，function是第一类型，如想要对function的结果进行链式的DSL改造
 *  可能的方案是对function进行封装为新的function
 *
 *  另一种方案，我们创建一个jFunction类型的对象
 *  该jFunciton拥有一个__fun__成员，指向被封装的function，并增加一个约束，外部代码不允许直接访问jfun.__fun__
 *  使该function没有机会直接被外部调用
 *
 *  如果想要调用该jfun.__fun__指向的function，仅有的办法是从jfun进行派生，在子对象中，对this.__fun__进行访问
 *  从而实现对jfun.__fun__的各种封装
 *
 *
 *  如：
 *
 *
     mul2 = jFunction.create({
        run: function(){
            return this.__fun__.apply(this, arguments);
        },
        map: function(){
            var rets = [];
            for(var i=0,len=arguments.length; i<len; i++){
                rets.push( this.run(arguments[i]) );
            }
            return rets;
        }
     }).initialize(function(num){
         return num*2;
     });

    console.log( mul2.run(2) );

    console.log( mul2.map(2,4) );
 *
 *
 */

var jFunction = (function(){

    var jObject = require('./object');

    /**
     *
     * jFunction 是自定义的函数对象，该对象封装了一个js的原生function
     *
     */
    return jObject.create({

        /**
         *
         * @method initialize
         *
         * @param {function} f  被封装的函数
         *
         */
        initialize: function(f){
            this.__fun__ = f;
            return this;
        }

    });

}());

(function(identifier, mod){
    var isAmd = typeof define === 'function',
    isCommonJs = typeof module === 'object' && !!module.exports;

    if (isAmd) {
        define(mod);
    } else if (isCommonJs) {
        module.exports = mod;
    }

}('jFunction', jFunction));

},{"./object":3}],2:[function(require,module,exports){
/**
 *
 * jcon 
 *
 * A JavaScript parser combinator Library
 *
 */
var jcon = (function(undefined){

    var slice = Array.prototype.slice,
    jObject = require('./object'),
    jFunction = require('./function.js');

    var result = jObject.create({
        ast: function(){
            var root = [],
            current = root,
            stack = [root];

            /**
             * 
             */
            function transAstNode(result){
                return {
                    type: result.astType || result.type,
                    value: result.value
                };
            }

            /**
             * @function visitParseTree
             *
             * @desc 从解析树到语法树
             *
             */
            function visitParseTree(result){
                var astNode;
                if(!!result.isAst){
                    astNode = transAstNode(result);
                    current.push(astNode);
                }
                if(result.rhs){
                    if(!!result.isAst){
                        current = astNode.childs = [];
                        stack.push(current);
                    }
                    for(var i=0; i<result.rhs.length; i++){
                        visitParseTree(result.rhs[i]);
                    }
                    if(astNode && astNode.childs instanceof Array && !astNode.childs.length){
                        delete astNode.childs;
                    }
                    if(!!result.isAst){
                        stack.pop()
                        current = stack[stack.length-1];
                    }
                }
            }
            visitParseTree(this);
            return root;
        }
    });

    function Parser(f){

        return jFunction.create(

        //尾处理器process及基于尾处理器的尾处理dsl
        {

            /**
             * @method process
             *
             * @param {function} proc
             *
             * @desc 对当前解析器函数对象的结果进行指定的处理
             *
             */
            process: function(proc){
                var self = this;
                return Parser(function(stream, index){
                    var result = self.parse(stream, index);
                    result = proc(result) || result;
                    return result;
                });
            },

            /**
             * @method flat
             *
             * @desc 将当前解析器解析出的value值进行数组平坦化(非深度平坦化，只针对当前结果数组中的每个元素，如是数组则合并，如不是数组则保持，并不进行递归
             */
            flat: function(){
                return this.process(function(result){
                    if(!!result.success && result.value instanceof Array){
                        var flats = [];
                        for(var i=0,len=result.value.length; i<len; i++){
                            if(result.value[i] instanceof Array){
                                flats = flats.concat(result.value[i]);
                            }else{
                                flats.push(result.value[i]);
                            }
                        }
                        result.value = flats;
                    }
                });
            },

            /**
             * @method skip
             *
             * @desc 将当前解析器的结果值加入skip的flag，在seq,times等合并解析结果时忽略该解析器的值
             */
            skip: function(){
                return this.process(function(result){
                    result.skip = true;
                });
            },

            /**
             * @method type
             * @param {string} type
             *
             * @desc 设置当前解析器解析结果的类型
             */
            type: function(type){
                return this.process(function(result){
                    result.type = type;
                });
            },
            setAst: function(astType){
                return this.process(function(result){
                    result.isAst = true;
                    result.astType = astType || result.type;
                });
            }
        },


        {
            /**
             * @method parse
             *
             */
            parse: function(){
                var args = slice.call(arguments, 0);
                args[1] = args[1] || 0;
                return this.__fun__.apply(this, args);
            },

            /**
             * @method seq
             *
             * @param {Array:Parser}
             *
             * @desc 使用this指向的当前解析器，和arguments中的解析器，进行连接运算，产生新的连接解析器
             *
             */
            seq: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);
                return jcon.seq.apply(jcon, args);
            },

            /**
             * @method not
             *
             * @param {Parser} parser   原解析器
             *
             * @desc 返回将原解析器取反的解析器：如原解析器解析成功，则返回出错信息，如原解析器解析失败，则在当前解析位置返回解析成功，长度为一个字符的解析结果
             *
             */
            not: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);
                return jcon.not.apply(jcon, args);
            },

            /**
             * @method and
             *
             * @param {Parser} parser   原解析器
             *
             * @desc 组合n个解析器，依次尝试解析，全部成功则解析成功，解析结果为被组合的解析器的最短解析结果

             *
             */
            and: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);
                return jcon.and.apply(jcon, args);
            },


            /**
             * @method or
             *
             * @param {Array:Parser}
             *
             * @desc 使用this指向的当前解析器，和arguments中的解析器，进行或运算，产生新的或解析器
             *
             */
            or: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);
                return jcon.or.apply(jcon, args);
            },

            /**
             *
             * @method times
             *
             * @param {number} min
             * @param {number} max
             *
             * @desc 返回this指向的当前parser的min到max次解析的解析器
             *
             */
            times: function(min, max){
                return jcon.times(this, min, max);
            },

            /**
             *
             * @method least
             *
             * @param {number} min
             *
             * @desc 返回this指向的当前parser的{{最少min次}}解析的解析器
             *
             */
            least: function(min){
                return this.times(min, Infinity);
            },

            /**
             * @method most
             *
             * @param {number} max
             *
             * @desc 返回this指向的当前parser的{{最多max次}}解析的解析器
             *
             */
            most: function(max){
                return this.times(0, max);
            },

            /**
             * @method many
             *
             * @desc 将当前解析器封装为进行{{0或尽量多的任意次}}匹配当前输入流的新解析器
             *
             */
            many: function(){
                return this.least(0);       //equal return this.most(Infinity);
            },


            /**
             * @method possible
             *
             * @desc 将当前解析器封装为进行0或1次匹配当前输入流的新解析器
             *
             */
            possible: function(){
                return this.most(1);
            },


            /**
             * @method lookhead
             *
             * @param {parser} lookhead 积极前瞻解析器
             *
             * @desc 当原解析器在当前输入流解析成功后，需要前瞻解析器在原解析器解析后的位置再次解析成功，原解析器才是解析成功的
             *
             */
            lookhead: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);

                return jcon.lookhead.apply(jcon, args);
            },

            /**
             * @method noLookhead
             *
             * @param {parser} noLookhead 消极前瞻解析器
             *
             * @desc 当原解析器在当前输入流解析成功后，需要前瞻解析器在原解析器解析后的位置再次解析失败，原解析器才是解析成功的
             *
             */
            noLookhead: function(){
                var args = slice.call(arguments, 0);
                args.unshift(this);

                return jcon.noLookhead.apply(jcon, args);
            }

        }
        
        ).initialize(f);
    }

    /**
     * 原子解析器的构造器，基于给定的模式（STR或RE），返回一个进行模式匹配（解析）的函数
     */
    return jObject.create({

        /**
         * @method string
         *
         * @param {string} str
         *
         * @return {function} 
         *
         * @desc 基于一个给定的字符串，创建一个parse函数
         *
         */
        string: function(str){
            return Parser(function(stream, index){
                if(stream.substr(index, str.length) === str){
                    return success(index, str);
                }else{
                    return fail(index, str);
                }
            });
        },

        /**
         * @method regex
         *
         * @param {regex} re            正则表达式
         * @param {number} opt grp      捕获组，默认为0
         */
        regex: function(re, grp){
            grp = grp || 0;

            //对正则进行处理，加入^符号，从被截取的输入流开头进行匹配
            re = eval(re.toString().replace(/^\//, '/^'));
            return Parser(function(stream, index){
                var match = re.exec(stream.slice(index));

                if(match && match[grp] !== undefined){
                    return success(index, match[grp]);
                }
                return fail(index, re);
            });
        },


        /**
         * @method success
         *
         * @param {string} value
         *
         * @desc 直接在输入流的当前位置返回一个成功状态
         *
         */
        success: function(value){
            return Parser(function(stream, index){
                return success(index, value);
            });
        },

        /**
         * @method fail
         *
         * @param {string} expected
         *
         * @desc 直接在当前输入流上返回一个失败状态
         *
         */
        fail: function(expected){
            return Parser(function(stream, index){
                return fail(index, expected);
            });
        },

        /**
         * @method chr
         *
         * @param {string} chr
         *
         * @desc 对当前输入流进行单个字符的匹配
         */
        chr: function(chr){
            return Parser(function(stream, index){
                if(stream[index] === chr){
                    return success(index, chr);
                }
                return fail(index, chr);
            });
        },

        /**
         * @method instr
         *
         * @param {string} str
         *
         * @desc 如果当前输入流中下一个字符在给定的string中，则返回成功状态
         *
         */
        inStr: function(str){
            return Parser(function(stream, index){
                if(str.indexOf(stream[index])>-1){
                    return success(index, stream[index]);
                }
                return fail(index, 'in ' + str);
            });
        },

        /**
         * @method noInStr
         *
         * @param str
         *
         * @desc 如果当前输入流下一个字符不在给定的字符串中，则返回成功状态
         */
        noInStr: function(str){
            return Parser(function(stream, index){
                if(str.indexOf(stream[index]) === -1 && stream[index] !== undefined){
                    return success(index, stream[index]);
                }
                return fail(index, 'no in '+ str);
            });
        },


        /**
         * @method until
         *
         * @param {function} assert
         *
         * @desc 不断的在输入流上进行匹配，直到不符合断言，将符合断言的串返回
         */
        until: function(assert){
            return Parser(function(stream, index){
                var values = [],
                currentIndex = index,
                chr;
                while(assert(stream[currentIndex])){
                    values.push(stream[currentIndex]);
                    currentIndex++;
                }
                if(values.length){
                    return success(index, values);
                }
                return fail(index, 'assert:' + assert.toString());
            });
        },

        /**
         * @method lazy
         *
         * @param {function} getParser
         *
         * @desc 解析规则由解析动作发生时才提供
         */
        lazy: function(getParser){

            return Parser(function(stream, index){
                var parser = getParser();
                return parser.parse(stream, index);
            });
        },

        /**
         * @method seq
         *
         * @param {Array:Parser} arguments      n个将要被以顺序方式组合的解析器
         *
         * @desc  进行解析器的顺序组合
         */
        seq: function(){
            var args = slice.call(arguments, 0);

            return Parser(function(stream, index){
                var currentIndex = index,
                values = [],
                results = [],
                result,
                parserIndex = 0,
                parser;
                while(parser = args[parserIndex++]){
                    result = parser.parse(stream, currentIndex);
                    if(result.success){
                        currentIndex = result.endIndex;
                        if(!result.skip && result.value !== ""){
                            values.push(result.value);
                            results.push(result);
                        }
                    }else{
                        return fail(currentIndex, '');
                    }
                }
                return success(index, values.join(''), {rhs: results, endIndex: currentIndex});
            });
        },


            
        /**
         * @method and
         *
         * @param {Array:Parser} arguments        组合n个解析器，依次尝试解析，全部成功则解析成功，解析结果为被组合的解析器的最短解析结果
         *
         * @desc 进行解析器的与组合
         */
        and: function(){
            var args = slice.call(arguments, 0);
            return Parser(function(stream, index){
                var parser,
                result,
                results = [],
                parserIndex = 0;
                while(parser = args[parserIndex++]){
                    result = parser.parse(stream, index);
                    if(result.success){
                        results.push(result);
                    }
                }
                if(results.length === args.length){
                    results.sort(function(a, b){return a.endIndex - b.endIndex;});
                    return results[0];
                }else{
                    return fail(index, 'in and_parser');
                }
            });
        },

        /**
         * @method or
         *
         * @param {Array:Parser} arguments        n个选择器，依次尝试匹配，返回最长的成功的
         *
         * @desc 进行解析器的或组合
         */
        or: function(){
            var args = slice.call(arguments, 0);

            return Parser(function(stream, index){
                var parser,
                result,
                results = [],
                parserIndex = 0;
                while(parser = args[parserIndex++]){
                    result = parser.parse(stream, index);
                    if(result.success){
                        results.push(result);
                    }
                }
                if(results.length){
                    results.sort(function(a, b){return b.endIndex - a.endIndex;});
                    return results[0];
                }else{
                    return fail(index, 'in or_parser');
                }
            });
        },

        /**
         * @method times
         *
         * @param {Parser} parser
         * @param {number} min
         * @param {number} max
         *
         * @desc 在当前输入流上，使用指定的parse进行最少min次，最多max次的匹配
         *
         */
        times: function(parser, min, max){
            return Parser(function(stream, index){
                var successTimes = 0,
                result,
                values = [],
                results = [],
                endIndex = index;       //因为会有skip-flag的存在，所以endIndex的计算不能使用startIndex+value.length

                do{
                    result = parser.parse(stream, result ? result.endIndex : index);
                    if(result.success){
                        endIndex = result.endIndex;
                        successTimes++;
                        if(!result.skip && result.value !== ""){
                            values.push(result.value);
                            results.push(result);
                        }
                        if(successTimes === max){
                            break;
                        }
                    }
                }while(result.success);

                if(successTimes >= min && successTimes <= max){
                    return success(index, values.join(''), {rhs: results, endIndex: endIndex});
                }else{
                    return fail(index, '');
                }
            });
        },

        /**
         * @method not
         *
         * @param {Parser} parser   原解析器
         *
         * @desc 返回将原解析器取反的解析器：如原解析器解析成功，则返回出错信息，如原解析器解析失败，则在当前解析位置返回解析成功，长度为一个字符的解析结果
         *
         */
        not: function(parser){
            return Parser(function(stream, index){
                var result = parser.parse(stream, index);

                if(result.success || stream[index] === undefined){
                    return fail(result.index, 'not('+result.value+')');
                }else{
                    return success(index, stream[index]);
                }
                return result;
            });
        },

        /**
         * @method lookhead
         *
         * @param {Parser} parser   原解析器
         * @param {parser} lookhead 积极前瞻解析器
         *
         * @desc 当原解析器在当前输入流解析成功后，需要前瞻解析器在原解析器解析后的位置再次解析成功，原解析器才是解析成功的
         *
         */
        lookhead: function(parser, lookhead){
            return Parser(function(stream, index){
                var result = parser.parse(stream, index);

                if(result.success){

                    var lookheadResult = lookhead.parse(stream, result.endIndex);

                    //在原解析器匹配成功时，但lookhead解析器匹配失败时，仍报错
                    if(!lookheadResult.success){
                        return fail(index, 'lookhead fail!');
                    }
                }
                return result;
            });
        },
        /**
         * @method noLookhead
         *
         * @param {Parser} parser   原解析器
         * @param {parser} noLookhead 消极前瞻解析器
         *
         * @desc 当原解析器在当前输入流解析成功后，需要消极前瞻解析器在原解析器解析后的位置解析失败，原解析器才是解析成功的
         *
         */
        noLookhead: function(parser, lookhead){
            return Parser(function(stream, index){
                var result = parser.parse(stream, index);

                if(result.success){

                    var lookheadResult = lookhead.parse(stream, result.endIndex);

                    //在原解析器匹配成功时，但noLookhead解析器匹配又成功时，就进行报错
                    if(lookheadResult.success){
                        return fail(index, 'noLookhead fail!');
                    }
                }
                return result;
            });
        }

    });



    /**
     * @function success
     * 
     * @param {number} index            匹配成功的位置
     * @param {string} value            匹配到的值
     * @param {object} more             更多的信息
     */
    function success(index, value, more){
        return result.create({
            success: true,
            startIndex: index,
            endIndex: index + value.length,
            length: value.length,
            value: value,
            expected: '',
            lastIndex: -1
        }, more);
    }

    /**
     * @function fail
     * 
     * @param {number} lastIndex        匹配失败的位置
     * @param {string} expected         期望匹配到的值
     * @param {object} more             更多的信息
     */
    function fail(lastIndex, expected, more){
        return jObject.create({
            success: false,
            index: -1,
            value: null,
            expected: expected,
            lastIndex: lastIndex
        }, more);
    }
}());

(function(identifier, mod){
    var isAmd = typeof define === 'function',
    isCommonJs = typeof module === 'object' && !!module.exports;

    if (isAmd) {
        define(mod);
    } else if (isCommonJs) {
        module.exports = mod;
    }

}('jcon', jcon));

},{"./function.js":1,"./object":3}],3:[function(require,module,exports){
/**
 * jObject
 *
 * 为javascript Object提供基于Object.create和mixin的，可使用隐式上下文DSL的继承和混入
 * 
 * 参考：http://javascript.crockford.com/prototypal.html
 * 参考：http://my.safaribooksonline.com/book/software-engineering-and-development/ide/9780132107549/common-topics/contextvariable_
 *
 */
var jObject = (function(undefined){

    var create = Object.create || function(o){ function F(){} f.prototype = o; return new F;},
    hasOwn = Object.prototype.hasOwnProperty;


    function mixin(){
        for(var i=0,len=arguments.length,o; i<len; i++){
            o = arguments[i];
            for(var k in o) if(hasOwn.call(o, k)) {
                this[k] = o[k]
            }
        }
        return this;
    }

    return {

        /**
         * @method mixin
         *
         * @param {Array:function) arguments 将要被混入this的对象
         *
         * @desc
         *   
         *  这是一个syntactic sugar
         *  源于martin fowler提到的隐式上下文DSL以及链式调用
         *
         *      mixin.call(obj, {a:1}, {b:2}, {c:3}) 等价于 obj.mixin({a:1}, {b:2}).mixin({c:3})
         */
        mixin: mixin,

        /**
         *
         * @method create
         *
         * @param {Array:function} arguments 将要被混入this的对象
         *
         * @desc:
         *
         *  这是一个syntactic sugar
         *  源于douglas crockford提到的begetObject
         *
         *      Object.create(obj) 等价于 obj.create()
         *
         *      mixin.call(Object.create(obj), {a:1}, {b:2}) 等价于 obj.create({a:1}, {b:2})
         *
         *
         */
        create: function(){
            return arguments.length ? mixin.apply(create(this), arguments) : create(this);
        }
    };



    /*  test inherit
    var animal = jObject.create({
        say: function(){
            console.log('....???');
        }
    });

    var sheep = animal.create({
        say: function(){
            console.log('miemie');
        }
    });

    animal.say();
    sheep.say();
    delete sheep.say;
    sheep.say();
    */

}());

(function(identifier, mod){
    var isAmd = typeof define === 'function',
    isCommonJs = typeof module === 'object' && !!module.exports;

    if (isAmd) {
        define(mod);
    } else if (isCommonJs) {
        module.exports = mod;
    }

}('jObject', jObject));

},{}],4:[function(require,module,exports){
/**
 *
 * jregexp
 *
 * refs:
 * http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap09.html
 * http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.5
 *
 */
var jregexp = (function(){

    var jcon = require('jcon');

    var epsilon = jcon.string('');

    //http://www.ecma-international.org/ecma-262/5.1/#sec-5.1.6
    var SourceCharacter = jcon.regex(/[\u0000-\uffff]/);

    //http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
    var LineTerminator = jcon.or(
        jcon.regex(/\u000a/),
        jcon.regex(/\u000d/),
        jcon.regex(/\u2028/),
        jcon.regex(/\u2029/)
    );

    //http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.5
    var RegularExpressionNonTerminator = jcon.and(
        SourceCharacter.setAst('char'),
        jcon.not(LineTerminator)
    );

    var COLL_ELEM_SINGLE = jcon.and(
        jcon.regex(/[\u0000-\u00ff]/),
        jcon.not(jcon.string(']'))
    );
    var COLL_ELEM_MULTI = jcon.regex(/[\u00ff-\uffff]/);
    var BACKREF = jcon.regex(/\\[0-9]/);
    var DUP_COUNT = jcon.regex(/\d+/);
    var L_ANCHOR = jcon.string('^').setAst('start-of-line');
    var SPEC_CHAR = jcon.or(
        jcon.string('^'),
        jcon.string('.'),
        jcon.string('['),
        jcon.string('$'),
        jcon.string('('),
        jcon.string(')'),
        jcon.string('|'),
        jcon.string('*'),
        jcon.string('+'),
        jcon.string('?'),
        jcon.string('{'),
        jcon.string('\\')
    );
    var ORD_CHAR = jcon.not(SPEC_CHAR).setAst('char');
    var QUOTED_CHAR = jcon.seq(
        jcon.string('\\'),
        SPEC_CHAR
    );
    var R_ANCHOR = jcon.string('$').setAst('end-of-line');

    var backslashSequence = jcon.or(
        jcon.string('\\w').setAst('word'),
        jcon.string('\\W').setAst('non-word'),
        jcon.string('\\d').setAst('digit'),
        jcon.string('\\D').setAst('non-digit'),
        jcon.string('\\s').setAst('white space'),
        jcon.string('\\S').setAst('non-white space'),
        jcon.seq(
            jcon.string('\\'),
            jcon.and(
                jcon.regex(/[\u0000-\uffff]/),
                jcon.not(
                    jcon.or(
                        jcon.regex(/\u000a/),
                        jcon.regex(/\u000d/),
                        jcon.regex(/\u2028/),
                        jcon.regex(/\u2029/)
                    )
                )
            ).setAst('char')
        ),
        jcon.seq(
            jcon.string('\\u'),
            jcon.regex(/[0-9a-fA-F]{4}/)
        ).setAst('unicode'),
        jcon.seq(
            jcon.string('\\x'),
            jcon.regex(/[0-9a-fA-F]{2}/)
        ).setAst('hex')
    );

    var backOpenParen = jcon.string('(');
    var backCloseParen = jcon.string(')');
    var backOpenBrace = jcon.string('{');
    var backCloseBrace = jcon.string('}');


    var RegularExpressionClassChar = jcon.or(
        backslashSequence,
        jcon.and(
            RegularExpressionNonTerminator,
            jcon.not(
                jcon.or(
                    jcon.string('\\'),
                    jcon.string(']')
                )
            )
        )
    );
    var end_range = RegularExpressionClassChar;
    var start_range = jcon.seq(
        end_range,
        jcon.string('-')
    );
    var range_expression = jcon.seq(
        start_range,
        end_range
    ).setAst('range_expression');
    var single_expression = end_range;
    var expression_term = jcon.or(single_expression, range_expression.setAst('range'));

    var follow_list = expression_term.least(1);

    var bracket_list = jcon.or(follow_list, 
        jcon.seq(follow_list, jcon.string('-')),
        jcon.string('')
    );
    
    var bracket_expression = jcon.or(
        jcon.seq(
            jcon.string('[^').skip(),
            bracket_list,
            jcon.string(']').skip()
        ).setAst('nomaching_list'),
        jcon.seq(
            jcon.string('[').skip(),
            bracket_list,
            jcon.string(']').skip()
        ).setAst('maching_list')
    );

    /* bracket-expression defined */


    var RegularExpressionChar = jcon.or(
        jcon.and(
            RegularExpressionNonTerminator,
            jcon.not(
                SPEC_CHAR
            )
        ),
        backslashSequence,
        bracket_expression
    );


    var RegularExpressionFirstChar = jcon.or(
        jcon.and(
            RegularExpressionNonTerminator,
            jcon.not(
                jcon.or(
                    jcon.string('*'),
                    jcon.string('\\'),
                    jcon.string('/'),
                    jcon.string('[')
                )
            )
        ),
        backslashSequence,
        bracket_expression
    );

    var RegularExpressionChars = RegularExpressionChar.many();

    var RegularExpressionBody = jcon.seq(
        RegularExpressionFirstChar,
        RegularExpressionChars
    );

    var ERE_dupl_symbol = jcon.or(
        jcon.string('*').setAst('dupl-many'),
        jcon.string('+').setAst('dupl-one-more'),
        jcon.string('?').setAst('dupl-possible'),
        jcon.seq(
            jcon.string('{'),
            DUP_COUNT.setAst('dupl-fixed'),
            jcon.string('}')
        ),
        jcon.or(
            jcon.seq(
                jcon.string('{'),
                DUP_COUNT.setAst('min'),
                jcon.string(','),
                jcon.string('}')
            ),
            jcon.seq(
                jcon.string('{'),
                DUP_COUNT.setAst('min'),
                jcon.string(','),
                DUP_COUNT.setAst('max'),
                jcon.string('}')
            )
        ).setAst('dupl-range')
    );

    var one_char_or_elem_RE = jcon.or(
        jcon.string('.').setAst('wildcard'),
        RegularExpressionChar,
        //ORD_CHAR,
        bracket_expression
    );

    var nondupl_RE = jcon.or(
        one_char_or_elem_RE,
        jcon.seq(
            jcon.string('('),
            jcon.lazy(function(){
                return RE_expression;
            }),
            jcon.string(')')
        ).setAst('group-catch'),
        jcon.seq(
            jcon.string('(?='),
            jcon.lazy(function(){
                return extended_reg_exp;
                return RE_expression;
            }),
            jcon.string(')')
        ).setAst('group-positive'),
        jcon.seq(
            jcon.string('(?!'),
            jcon.lazy(function(){
                return extended_reg_exp;
                return RE_expression;
            }),
            jcon.string(')')
        ).setAst('group-negative'),
        jcon.seq(
            jcon.string('(?:'),
            jcon.lazy(function(){
                return extended_reg_exp;
                return RE_expression;
            }),
            jcon.string(')')
        ).setAst('group-non-catch'),
        BACKREF
    );

    var simple_RE = jcon.or(
        nondupl_RE,
        jcon.seq(nondupl_RE, ERE_dupl_symbol)
    );

    var RE_expression = simple_RE.least(1);

    var basic_reg_exp = jcon.or(
        L_ANCHOR,
        R_ANCHOR,
        jcon.seq(L_ANCHOR, R_ANCHOR),
        jcon.seq(L_ANCHOR, RE_expression),
        jcon.seq(L_ANCHOR, RE_expression, R_ANCHOR),
        jcon.seq(RE_expression, R_ANCHOR),
        RE_expression
    ).setAst('basic_RE');

    var extended_reg_exp = jcon.or(
        basic_reg_exp,
        jcon.seq(
            basic_reg_exp,
            jcon.string('|'),
            jcon.lazy(function(){
                return extended_reg_exp;
            })
        ).setAst('alter')
    ).setAst('extended_RE');

    return extended_reg_exp;

})();
(function(identifier, mod){
    var isAmd = typeof define === 'function',
    isCommonJs = typeof module === 'object' && !!module.exports;

    if (isAmd) {
        define(mod);
    } else if (isCommonJs) {
        module.exports = mod;
    }

}('jregexp', jregexp));

},{"jcon":2}],5:[function(require,module,exports){
var jregexp = require('jregexp');

var REForm = React.createClass({displayName: "REForm",
    view: function(){
        var re = document.getElementById('re').value;
        var ast = jregexp.parse(re);
        if(ast.ast){
            var aststr = JSON.stringify(ast.ast(), null, '  ');
            console.log(aststr);
        }
    },
    render: function(){
        return (
            React.createElement("div", {className: "panel panel-default"}, 
                React.createElement("div", {className: "panel-heading"}, "RE Expression"), 
                React.createElement("div", {className: "panel-body"}, 
                    React.createElement("div", {className: "input-group input-group-lg"}, 
                        React.createElement("span", {className: "input-group-addon"}, "re"), 
                        React.createElement("input", {className: "form-control", id: "re", type: "text", placeholder: "^abc"}), 
                        React.createElement("span", {className: "input-group-btn"}, 
                            React.createElement("input", {className: "btn btn-default", type: "button", value: "view", onClick: this.view})
                        )
                    )
                )
            )
        );
    }
});

React.render(
    React.createElement(REForm, null),
    document.getElementById('re-form')
);

},{"jregexp":4}]},{},[5])