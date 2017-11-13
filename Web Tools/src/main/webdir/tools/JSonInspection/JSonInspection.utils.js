//==================================================================================================

function JSI_isArray(object)
{
  if(!object) {
    return false;
  }
  return (typeof object == "object") && ("length" in object);
}

function JSI_isObject(object)
{
  if(!object) {
    return false;
  }
  return (typeof object == "object") && !("length" in object);
}

function JSI_read(object, field)
{
  if(!object) {
    return null;
  }
  return field in object ? object[field] : null;
}

function JSI_eq(obj1, obj2)
{
  if(JSI_isArray(obj1) && JSI_isArray(obj2)) {
    if(obj1.length != obj2.length) {
      return false;
    }
    for( var x in obj1) {
      if(!JSI_eq(obj1[x], obj2[x])) {
        return false;
      }
    }
    return true;
  }
  else if(JSI_isObject(obj1) && JSI_isObject(obj2)) {
    var fields = {};
    for( var x in obj1) {
      fields[x] = true;
    }
    for( var x in obj2) {
      fields[x] = true;
    }
    for( var field in fields) {
      var v1 = JSI_read(obj1, field);
      var v2 = JSI_read(obj2, field);
      if(!JSI_eq(v1, v2)) {
        return false;
      }
    }
    return true;
  }
  else {
    return obj1 == obj2;
  }
}

function JSI_simplify(objects)
{
  if(objects.length <= 1) {
    return;
  }
  var type = "";
  for( var x in objects) {
    var obj = objects[x];
    var t = typeof obj;
    if(t == "object") {
      if(JSI_isArray(obj)) {
        t = "array";
      }
    }
    if(type == "") {
      type = t;
    }
    else if(type != t) {
      return; // different types: cannot simplify
    }
  }
  
  if(type == "object") {
    JSI_simplifyObjects(objects);
  }
  else if(type == "array")
  {
    JSI_simplifyArrays(objects);
  }
}

function JSI_simplifyObjects(objects)
{
  var fields = [];
  var fieldsMap = {};

  for( var x in objects) {
    var object = objects[x];
    for( var y in object) {
      if(!fieldsMap[y]) {
        fieldsMap[y] = true;
        fields.push(y);
      }
    }
  }

  for( var x in fields) {
    var field = fields[x];
    JSI_simplifyProperty(field, objects);
  }
}

function JSI_simplifyProperty(property, objects)
{
  var values = [];
  for( var x in objects) {
    var object = objects[x];
    var value = JSI_read(object, property);
    values.push(value);
  }

  var first = true;
  for( var x in values) {
    var value = values[x];
    if(first) {
      var previousValue = value;
      first = false;
    }
    else {
      if(!JSI_eq(previousValue, value)) {
        JSI_simplify(values);
        return;
      }
    }
  }

  for( var x in objects) {
    var object = objects[x];
    delete object[property];
  }
}

function JSI_simplifyArrays(arrays)
{
  var minlen = -1;
  for( var x in arrays) {
    var array = arrays[x];
    if(minlen < 0 || array.length < minlen) {
      minlen = array.length;
    }
  }

  for(var x = 0; x < minlen; ++x) {
    var objects = [];
    for(i in arrays) {
      var array = arrays[i];
      objects.push(array[x]);
    }
    JSI_simplify(objects);
  }
}

/**
 * Difference between ojects.
 * This function accepts any number of arguments.
 */
function JSI_DIFF()
{
  var objects = [];

  for( var x in arguments) {
    var argument = arguments[x];
    if(JSI_isArray(argument)) {
      for( var i in argument) {
        objects.push(jQuery.extend(true, {}, argument[i]));
      }
    }
    else if(JSI_isObject(argument)) {
      objects.push(jQuery.extend(true, {}, argument));
    }
    else if(typeof argument == "number") {
      objects.push(argument);
    }
    else if(typeof argument == "string") {
      objects.push(argument);
    }
    else if(typeof argument == "boolean") {
      objects.push(argument);
    }
  }

  if(objects.length <= 1) {
    return objects;
  }

  var fields = [];
  var fieldsMap = {};
  var NOFIELD = "\0\0Object Value - " + Date.now() + "\0\0";

  for( var x in objects) {
    var object = objects[x];
    if(JSI_isArray(object) || JSI_isObject(object)) {
      for( var y in object) {
        if(!fieldsMap[y]) {
          fieldsMap[y] = true;
          fields.push(y);
        }
      }
    }
    else {
      if(!fieldsMap[NOFIELD]) {
        fieldsMap[NOFIELD] = true;
        fields.push(NOFIELD);
      }
    }
  }

  var differences = [];
  for( var x in objects) {
    differences.push({});
  }

  var values = {};
  for( var y in fields) {
    var field = fields[y];
    values[field] = [];
    for( var x in objects) {
      var object = objects[x];
      var isObject = JSI_isObject(object) || JSI_isArray(object);
      if(isObject) {
        if(field == NOFIELD) {
          var value = null;
        }
        else {
          var value = JSI_read(object, field);
        }
        differences[x][field] = value;
        values[field].push(value);
      }
      else {
        if(field == NOFIELD) {
          var value = object;
          differences[x] = object;
          values[field].push(null);
        }
        else {
          var value = null;
        }
      }
    }
  }

  var fieldsToRemove = [];

  for( var field in values) {
    var list = values[field];
    var value = list[0];
    var remove = true;
    JSI_simplify(list);
    for( var x in list) {
      var v = x == 0 ? value : list[x];
      if(!JSI_eq(v, value)) {
        var remove = false;
        break;
      }
    }
    if(remove) {
      fieldsToRemove.push(field);
    }
  }

  for( var x in differences) {
    var object = differences[x];
    for( var f in fieldsToRemove) {
      var field = fieldsToRemove[f];
      delete object[field];
    }
  }

  return differences;
}

//==================================================================================================

/**
 * Statistics over a list of objects
 */
function JSI_COUNT(objectsList, fieldsArray)
{
  var readField = function(object, field)
  {
    return function()
    {
      try {
        return eval("this." + field);
      }
      catch(err) {
        return null
      }
    }.call(object);
  };
  var stats = {};

  for( var x in objectsList) {
    var object = objectsList[x];
    if(object) {
      var values = {};
      var key = "";
      for( var y in fieldsArray) {
        var field = fieldsArray[y];
        var value = readField(object, field);
        values[field] = value;
        var key = key + "\t\t\t" + field + "\t" + value;
      }
      var stat = stats[key];
      if(stat) {
        stat.count++;
      }
      else {
        stats[key] = {
          values: values,
          count: 1
        };
      }
    }
  }

  var result = [];

  for( var x in stats) {
    var stat = stats[x];
    var values = stat.values;
    values["$COUNT"] = stat.count;
    result.push(values);
  }

  return result;
}

//==================================================================================================

/**
 * Filter objects from a list accepting only elements which fulfill a given condition expressed by the given function or expression
 */
function JSI_FILTER(objectsList, condition)
{
  if(typeof condition == "string") {
    var evaluateCondition = function(object, index)
    {
      return function()
      {
        return eval(condition);
      }.call(object);
    };
  }
  else {
    var evaluateCondition = function(object, index)
    {
      return condition(object, index);
    };
  }

  var result = [];

  for( var x in objectsList) {
    var object = objectsList[x];
    if(object) {
      var select = evaluateCondition(object, x);
      if(select) {
        result.push(object);
      }
    }
  }
  return result;
}

//==================================================================================================
