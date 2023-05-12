"use strict";

var content = "";
var symbols = [];

let stdlib = document.getElementsByClassName("stdlib")[0].innerHTML;

var fnTable = {
  add : (a, b) => a + b,
  sub : (a, b) => a - b,
  print : (x) => console.log(x),
  mul : (a, b) => a * b,
  div : (a, b) => a / b,
  mod : (a, b) => a % b,
  list : (...args) => args,
  prompt : (x) => prompt(x),
  equ : (x, y) => x === y,
  neq : (x, y) => x != y,
  and : (x, y) => x && y,
  or : (x, y) => x || y,
  gt : (x, y) => x > y,
  lt : (x, y) => x < y,
  get : (obj, key) => obj[key],
  list : (...elements) => elements,
  set : (obj, key, value) => {
    obj[key] = value;
    return obj;
  },
  text : (col, t) => {
    document.getElementsByClassName("out")[0]
        .getElementsByClassName("col" + col)[0]
        .innerHTML += t;
  },
  call : (...args) => {
    if (args.length === 1)
      return args[0]();
    else
      return args[0](...args.slice(1));
  },
  js : (str) => eval(str),
  callOn: (obj, fun, ...args) => fun.call(obj, ...args)
};

function onButtonClick() {
  if(document.getElementById("usestdlib").value) {
    content = stdlib;
  }
  handleContent();
  updateContent();
  handleContent();
}
function updateContent() { content = document.getElementById("input").value; }
/*
// comment
// ignore whitespace
(print (* 16 (get "Hallo")))

*/

var TokenType = {
  LPAREN : {
    is_start : (t) => t == "(",
    is_full : (t) => t == "(",
    to_relevant : (x) => { return {type : "LPAREN", val : ""}; },
  },
  RPAREN : {
    is_full : (t) => t == ")",
    is_start : (t) => t == ")",
    to_relevant : (x) => { return {type : "RPAREN", val : ""}; },
  },
  IDENT : {
    is_full : (t) => false,
    is_start : (c) => {
      c = (c + "").toLowerCase().charAt(0);
      return (c == "a" || c == "b" || c == "c" || c == "d" || c == "e" ||
              c == "f" || c == "g" || c == "h" || c == "i" || c == "j" ||
              c == "k" || c == "l" || c == "m" || c == "n" || c == "o" ||
              c == "p" || c == "q" || c == "r" || c == "s" || c == "t" ||
              c == "u" || c == "v" || c == "w" || c == "x" || c == "y" ||
              c == "z");
    },
    to_relevant : (x) => { return {type : "IDENT", val : x}; },
    begin_lit : (c) => c,
    can_contain : function(c) { return this.is_start(c) || c === "_"; },
  },
  INTLIT : {
    is_full : (t) => false,
    is_start : (t) => !isNaN(parseInt(t)),
    can_contain : (c) => { return !isNaN(parseInt(c)); },
    to_relevant : (x) => { return {type : "INTLIT", val : parseInt(x)}; },
    begin_lit : (c) => c,
  },
  STRLIT : {
    is_full : (t) => false,
    is_start : (t) => t == '"',
    can_contain : (c) => (c != '"' ? (c == "\\" ? "c" : true) : "s"),
    to_relevant : (x) => { return {type : "STRLIT", val : unescape(x)}; },
    begin_lit : (c) => "",
  },
  LCURLY : {
    is_full : (c) => c == "{",
    is_start : (c) => false,
    to_relevant : (x) => { return {type : "LCURLY", val : ""}; },
  },
  RCURLY : {
    is_full : (c) => c == "}",
    is_start : (c) => false,
    to_relevant : (x) => { return {type : "RCURLY", val : ""}; },
  },
};

function scanContent() {
  for (let i = 0; i < content.length; i++) {
    if (content[i] == "/" && 1 + i < content.length && content[i + 1] == "/") {
      while (i + 1 < content.length && content[i] != "\n")
        i++;
      if (i + 1 < content.length)
        i++;
    }
    for (let type in TokenType) {
      if (TokenType[type].is_full(content[i])) {
        symbols.push(TokenType[type].to_relevant(null));
        break;
      }
      if (TokenType[type].is_start(content[i])) {
        let lit = TokenType[type].begin_lit(content[i]) || "";
        let result;
        i++;

        while ((result = TokenType[type].can_contain(content[i])) !== false &&
               i < content.length) {
          // console.log(result, TokenType[type].can_contain(content[i]), type,
          // content[i]);
          lit += content[i];

          if (result === "c") {
            i++;
            lit += content[i];
          }
          if (result === "s") {
            i++;
            lit = lit.substr(0, lit.length - 1);
            break;
          }
          i++;
          // console.log(i);
        }
        // FIXME HACK
        i--;

        symbols.push(TokenType[type].to_relevant(lit));
        break;
      }
    }
  }
}

function parse(symbols) {
  if (symbols.length === 0)
    return [];
  var nodes = [];
  let expression = expr(symbols);
  nodes.push(expression.node);
  nodes.push(...parse(symbols.slice(expression.cursor)));
  return nodes;
}

function expr(msymbols) {
  let node = {}, x = 0;
  if (msymbols[0].type == "LPAREN") {
    if (msymbols[0 + 1].type != "IDENT")
      throw "expected IDENT";
    let name = msymbols[0 + 1].val, args = [];
    x = 2;
    let ret = {cursor : 0};
    while (msymbols[x].type !== "RPAREN") {
      ret = expr(msymbols.slice(x));
      args.push(ret.node);
      x += ret.cursor;
    }
    x++;
    if (name.toLowerCase() === "ret") {
      if (args.length > 1)
        throw "Only one argument to return allowed";
      node = {type : "RET", arg : args[0] || ""};
    } else
      node = {type : "FNCALL", name, args};
  } else if (msymbols[0].type == "STRLIT") {
    node = {type : "STRLIT", val : msymbols[0].val};
    x = 1;
  } else if (msymbols[0].type == "INTLIT") {
    node = {type : "INTLIT", val : msymbols[0].val};
    x = 1;
  } else if (msymbols[0].type == "IDENT" &&
             msymbols[0].val.toLowerCase() == "def") {
    let name = null;
    if (msymbols[0 + 1].type === "IDENT")
      name = msymbols[1].val;
    x = 2;
    let args = [];
    while (msymbols[x].type == "IDENT") {
      args.push(msymbols[x].val);
      x++;
    }
    let exprs = [];
    let ret = {cursor : 0};
    x++;
    while (msymbols[x].type !== "RCURLY") {
      ret = expr(msymbols.slice(x));
      exprs.push(ret.node);
      x += ret.cursor;
    }
    x++;
    node = {type : "DEF", name, exprs, args};
  } else if (msymbols[0].type == "IDENT") {
    node = {type : "VAR", name : msymbols[0].val};
    x++;
  }

  return {cursor : x, node};
}

function interpretContent(nodes) { nodes.forEach(visit); }
function tryCall(fn, args) {
  return fn ? fn(...args) : (() => { throw "undefined function"; })();
}
function callFn(name, args, additionalFns = {}) {
  if (fnTable[name] === undefined)
    return tryCall(additionalFns[name], args);
  return fnTable[name](...args);
}

function visit(node, capture = {}, additionalFns = {}) {
  fnTable = Object.fromEntries(
      Object.entries(fnTable).filter(([ key ]) => key !== "__anon"));
  switch (node.type) {
  case "STRLIT":
    return node.val;
  case "INTLIT":
    return parseInt(node.val);
  case "FNCALL":
    if (node.name === "if") {
      if (node.args.length !== 2)
        throw "If Argument length mismatch";
      if (visit(node.args[0], capture, additionalFns)) {
        if (node.args[1].type !== "DEF")
          return visit(node.args[1], capture, additionalFns);
        else
          return visit(node.args[1], capture, additionalFns)();
      }
      return false;
    }
    if (node.name === "ifelse") {
      if (node.args.length !== 3)
        throw "If-else Argument length mismatch";
      if (visit(node.args[0], capture, additionalFns)) {
        if (node.args[1].type !== "DEF")
          return visit(node.args[1], capture, additionalFns);
        else
          return visit(node.args[1], capture, additionalFns)();
      } else {
        if (node.args[2].type !== "DEF")
          return visit(node.args[2], capture, additionalFns);
        else
          return visit(node.args[2], capture, additionalFns)();
      }
      return false;
    }
    if (node.name === "button") {
      if (node.args.length !== 2)
        throw "'Button' Argument length mismatch";
      const run = () => {
        if (node.args[1].type !== "DEF")
          return visit(node.args[1], capture, additionalFns);
        else
          return visit(node.args[1], capture, additionalFns)();
      };
      const id = Math.floor(200 * Math.random());
      const button = document.createElement("button");
      button.setAttribute("id", id);
      button.addEventListener("click", run);
      button.append(visit(node.args[0], capture, additionalFns));
      document.getElementsByClassName("out")[0].append(button);

      return false;
    }
    return callFn(node.name,
                  node.args.map((el) => visit(el, capture, additionalFns)),
                  additionalFns);
  case "DEF":
    return defineFn(node.name == "_" ? "__anon" : node.name, node.exprs,
                    node.args);
  case "VAR":
    return (capture[node.name] === undefined
                ? (fnTable[node.name] === undefined
                       ? (additionalFns[node.name] === undefined
                              ? (() => {throw "undefined var"})()
                              : additionalFns[node.name])
                       : fnTable[node.name])
                : capture[node.name]);
  case "RET":
    return node;
  default:
    return null;
  }
}

function defineFn(name, exprs, args, initialCapture = {}) {
  fnTable[name] = function run(...callArgs) {
    if (callArgs.length != args.length)
      throw "Argument mismatch";
    let ret = 0;
    const capture =
        Object.assign(initialCapture, Object.fromEntries(args.map((el, i) => {
          return [ el, callArgs[i] ];
        })));
    for (let i = 0; i < exprs.length; i++) {
      const el = exprs[i];
      const exprVal = visit(el, Object.assign({}, capture), Object.fromEntries([
        [ name, (...recursiveArgs) => run(...recursiveArgs) ],
      ]));
      if (exprVal && exprVal.type === "RET") {
        if (exprVal.arg === "") {
          return;
        }
        const val =
            visit(exprVal.arg, Object.assign({}, capture), Object.fromEntries([
              [ name, (...recursiveArgs) => run(...recursiveArgs) ],
            ]));
        return val;
      }
    }
  };
  return fnTable[name];
}

function handleContent() {
  let out = document.getElementsByClassName("out")[0];
  Array.prototype.forEach.call(out.children, (el) => (el.innerHTML = ""));
  symbols = [];
  scanContent();
  // console.log(symbols)
  let nodes = parse(symbols);
  interpretContent(nodes);
}
