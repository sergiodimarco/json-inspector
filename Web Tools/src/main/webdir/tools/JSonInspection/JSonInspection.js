//==================================================================================================

/**
 * Initialize the UI after the page has been loaded. 
 */
$(document).ready(function()
{
  JSI_initializeDialog("AddJSonObject", JSI_parseAndAddJSonObject, null, function()
  {
    $("#Text_JSon").val("");
    $("#Text_ObjectName").val("");
    $("#Error_AddJSonObject").text("");
  });
  JSI_initializeDialog("SelectJSonObject");
  JSI_initializeDialog("EnterScript", JSI_executeScript);
  JSI_initializeDialog("Upload", JSI_Upload, null, function()
  {
    $("#uploadError").text("");
  });
  JSI_initializeSourceCodeTool();
  JSI_initializeSearchTool();
  JSI_initializeDialog("Documentation");

  JSI_initializeUIActions();

  $(window).on('beforeunload', function()
  {
    return 'ATTENZIONE: si stanno per pedere tutti i dati.\nVuoi veramente lasciare la pagina?';
  });

  $.fn.selectElementContents = function()
  {
    var el = $(this).get(0);
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  $.fn.readLocalFile = function()
  {
    var el = $(this).get(0);
    if(el.files.length <= 0) {
      return null;
    }
    var file = el.files[0];
    var reader = new FileReader();
    reader.onload = function()
    {
      JSI_UploadEnd(file, reader);
    };
    reader.readAsText(file);
  };

  var sortableOptions = {
    cancel: '.content',
    cursor: 'move',
    delay: 10,
    distance: 10,
    opacity: 0.5,
    handle: '.draghandle',
    tolerance: 'pointer'
  };

  $("#output").sortable({}, sortableOptions, {
    axis: 'y'
  });

  $("#List_Objects").sortable({}, sortableOptions);
});

function JSI_initializeUIActions()
{
  $("#Btn_ToggleSidebar").click(function()
  {
    JSI_ToggleShowObject();
  });

  $("#Btn_Download").click(function()
  {
    var object = {
      //OBJ: OBJ,
      //JSI_OBJECT: JSI_OBJECT,
      //JSI_OBJECTS: JSI_OBJECTS,
      JSI_OBJECTNAMES: JSI_OBJECTNAMES,
      JSI_JSonObjectSources: JSI_JSonObjectSources,
      JSI_SelectedJSonID: JSI_SelectedJSonID,
      JSI_IDCounters: JSI_IDCounters
    };

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(object));
    var link = $.parseHTML("<a>Download</a>");
    $(link).attr("href", dataStr);
    $(link).attr("download", "JSonInspector.session.json");
    $(link).css("display", "none");
    $("body").append(link);
    $(link)[0].click();
    $(link).detach();
  });
}

function JSI_Upload()
{
  $("#uploadError").text("");
  $("#jsonFile").readLocalFile();
  return false;
}

function JSI_UploadEnd(file, fileReader)
{
  try {
    var result = fileReader.result;
    var object = $.parseJSON(result);
    if(("JSI_OBJECTNAMES" in object) && ("JSI_JSonObjectSources" in object) && ("JSI_SelectedJSonID" in object)
        && ("JSI_IDCounters" in object)) {
      JSI_UploadObject(object);
      $("#uploadError").text("OK");
    }
    else {
      $("#uploadError").text("Wrong file content");
    }
  }
  catch(error) {
    $("#uploadError").text("Error: " + error);
  }
}

function JSI_UploadObject(object)
{
  var OBJECTS = {};
  for(id in object.JSI_JSonObjectSources) {
    var source = object.JSI_JSonObjectSources[id];
    OBJECTS[id] = $.parseJSON(source);
  }

  OBJ = {};
  JSI_OBJECT = {};
  JSI_OBJECTS = {};
  JSI_OBJECTNAMES = object.JSI_OBJECTNAMES;
  JSI_JSonObjectSources = object.JSI_JSonObjectSources;
  JSI_SelectedJSonID = object.JSI_SelectedJSonID;
  JSI_IDCounters = object.JSI_IDCounters;

  $("#List_Objects").text("");

  for(id in OBJECTS) {
    var jsonObject = OBJECTS[id];
    var name = JSI_OBJECTNAMES[id];
    var source = JSI_JSonObjectSources[id];
    JSI_OBJECTS[id] = jsonObject;
    OBJ[name] = jsonObject;
    JSI_addJSonObjectRecord(id, name, source);
  }

  JSI_OBJECT = JSI_OBJECTS[JSI_SelectedJSonID];
}

function JSI_ShowObject(showFlag)
{
  var objectPanel = $("#jsonObject");
  var workArea = $("#workArea");
  var searchGadget = $("#search");
  if(showFlag) {
    objectPanel.removeClass("jsonObjectHidden");
    workArea.removeClass("workAreaFull");
    objectPanel.fadeIn(300);
    searchGadget.fadeIn(300);
  }
  else {
    objectPanel.addClass("jsonObjectHidden");
    objectPanel.fadeOut(300, function()
    {
      workArea.addClass("workAreaFull");
    });
    searchGadget.fadeOut(300);
  }
}

function JSI_ToggleShowObject()
{
  JSI_ShowObject($("#jsonObject").hasClass("jsonObjectHidden"));
}

/**
 * Initializes a given dialog hooking the handlers for open/ok/cancel events.
 * 
 * @param dialog
 * @param okFunction
 * @param cancelFunction
 * @param openFunction
 */
function JSI_initializeDialog(dialog, okFunction, cancelFunction, openFunction)
{
  $("#Btn_Start" + dialog).click(function()
  {
    if(openFunction) {
      var ret = openFunction();
      if(!ret && ret != undefined) {
        return;
      }
    }
    $("#Dialog_" + dialog).addClass("visible");
  });

  $("#Btn_Cancel" + dialog).click(function()
  {
    if(cancelFunction) {
      var ret = cancelFunction();
      if(!ret && ret != undefined) {
        return;
      }
    }
    JSI_closeDialog(dialog);
  });

  $("#Btn_Ok" + dialog).click(function()
  {
    if(okFunction) {
      var ret = okFunction();
      if(!ret && ret != undefined) {
        return;
      }
    }
    JSI_closeDialog(dialog)
  });
}

function JSI_initializeSearchTool()
{
  $("#Btn_Search").click(function()
  {
    JSI_search($("#Text_Search").val());
  });
  $("#Text_Search").keypress(function(evt)
  {
    switch(evt.which) {
      case 13:
        JSI_search($("#Text_Search").val());
    }
  });
}

function JSI_initializeSourceCodeTool()
{
  var original;
  JSI_initializeDialog("JSonObjectSource", null, null, function()
  {
    if(!JSI_OBJECT) {
      return;
    }
    original = true;
    $("#Text_JSonSource").val(JSI_JSonObjectSources[JSI_SelectedJSonID]);
  });
  $("#Btn_ToggleJSonObjectSource").click(function()
  {
    if(!JSI_OBJECT) {
      return;
    }
    original = !original;
    if(original) {
      $("#Text_JSonSource").val(JSI_JSonObjectSources[JSI_SelectedJSonID]);
    }
    else {
      $("#Text_JSonSource").val(JSON.stringify(JSI_OBJECT));
    }
  });
}

function JSI_closeDialog(dialog)
{
  $("#Dialog_" + dialog).removeClass("visible");
}

//==================================================================================================

var JSI_IDCounters = {};

/**
 * Generate a unique ID
 *
 * @returns {String}
 */
function JSI_GenerateID(prefix)
{
  if(!prefix) {
    prefix = "ID";
  }
  if(!JSI_IDCounters[prefix]) {
    JSI_IDCounters[prefix] = 0;
  }
  return prefix + (++JSI_IDCounters[prefix]);
}

//==================================================================================================

var OBJ = {};
var JSI_OBJECT;
var JSI_OBJECTS = {};
var JSI_OBJECTNAMES = {};
var JSI_JSonObjectSources = {};
var JSI_SelectedJSonID;

function JSI_parseAndAddJSonObject()
{
  $("#Error_AddJSonObject").text("");

  var source = $("#Text_JSon").val();
  if(source == "") {
    return;
  }

  var objectName = $("#Text_ObjectName").val();

  try {
    var jsonObject = $.parseJSON(source);
    JSI_addJSonObject(jsonObject, source, objectName);
  }
  catch(err) {
    $("#Error_AddJSonObject").text("Error: " + err);
    return false;
  }
}

function JSI_addJSonObject(jsonObject, source, objectName)
{
  var id = JSI_GenerateID();

  JSI_OBJECTS[id] = jsonObject;
  JSI_JSonObjectSources[id] = source;

  if(!objectName) {
    objectName = id;
  }

  JSI_OBJECTNAMES[id] = objectName;
  JSI_addJSonObjectRecord(id, objectName, source);
  JSI_selectJSonObject(id);
}

function JSI_addJSonObjectRecord(id, objectName, source)
{
  var html = "<table class='objectName' id='Object_" + id
      + "'><tr><td class='draghandle'><div class='draghandle'></div></td><td><img src='select_30x30.png' id='Select_"
      + id + "'/></td><td style='padding-left: 15px; padding-right: 15px'><div contenteditable='true' id='Text_" + id
      + "'></div></td><td><img src='delete_30x30.png' id='Delete_" + id + "'/></td></table>";

  $("#List_Objects").append(html);
  $("#Delete_" + id).click(function()
  {
    $("#Object_" + id).detach();
    delete JSI_OBJECTS[id];
    delete JSI_JSonObjectSources[id];
    JSI_deleteOBJ(id);
  });
  $("#Select_" + id).click(function()
  {
    JSI_selectJSonObject(id);
    JSI_closeDialog("SelectJSonObject");
  });

  $("#Text_" + id).text(objectName);
  $("#Text_" + id).focusout(function()
  {
    var newName = $(this).text();
    if(!newName) {
      newName = id;
      $(this).text(newName);
    }
    JSI_renameOBJ(id, newName)
  });
  $("#Object_" + id).attr("title", id + "\n" + source.substring(0, 1024));
}

function JSI_ensureOBJ()
{
  if(!OBJ) {
    OBJ = {};
  }
  else if(typeof OBJ != "object") {
    OBJ = {};
  }
  else if("length" in OBJ) {
    OBJ = {};
  }
  return OBJ;
}

function JSI_renameOBJ(id, newName)
{
  JSI_ensureOBJ();
  if(!newName) {
    newName = id;
  }
  var oldName = JSI_OBJECTNAMES[id];
  if(newName == oldName) {
    return;
  }
  OBJ[newName] = OBJ[oldName];
  delete OBJ[oldName];
  JSI_OBJECTNAMES[id] = newName;
}

function JSI_deleteOBJ(id)
{
  JSI_ensureOBJ();
  if(id in JSI_OBJECTNAMES) {
    var objectName = JSI_OBJECTNAMES[id];
    if(objectName in OBJ) {
      delete OBJ[objectName];
    }
    delete JSI_OBJECTNAMES[id];
  }
}

function JSI_updateOBJ(jsonObject, objectName)
{
  JSI_ensureOBJ();
  OBJ[objectName] = jsonObject;
}

function JSI_selectJSonObject(id)
{
  JSI_OBJECT = JSI_OBJECTS[id];
  var objectName = JSI_OBJECTNAMES[id];
  JSI_updateOBJ(JSI_OBJECT, objectName);

  if(id == JSI_SelectedJSonID) {
    return;
  }

  JSI_SelectedJSonID = id;

  $("#jjson").jJsonViewer(JSON.stringify(JSI_OBJECT), {
    expanded: false
  });

  JSI_cleanSearch(false);
}

//==================================================================================================

function JSI_cleanSearch(cleanHighlights)
{
  $("#searchResult").text("");
  if(cleanHighlights) {
    $("#jjson span").each(function()
    {
      $(this).removeClass("found");
    });
  }
}

function JSI_search(text)
{
  JSI_cleanSearch(true);
  if(text == "") {
    return;
  }

  $("#searchResult").html("Search: <span id='searchText'></span><br/>Found <span id='searchCount'></span> instance(s)");
  $("#searchResult>#searchText").text(text);

  $("#jjson .jjson-container .expanded").each(function()
  {
    var $self = $(this);
    $self.parent().find('>ul').slideUp(100, function()
    {
      $self.addClass("collapsed");
    });
  });

  $("#jjson span").each(function()
  {
    $(this).removeClass("found");
  });

  var searchTotalCount = 0;
  var toExpand = {};
  $("#jjson span.key, #jjson span.string, #jjson span.number,  #jjson span.boolean").each(function()
  {
    var span = $(this);
    var value = span.text();
    var idx = value.indexOf(text);
    if(idx >= 0) {
      var value = span.text();
      var container = $.parseHTML("<span></span>");
      span.empty();
      searchTotalCount += JSI_markFound($(container), text, value);
      span.html(container);
      span.parent().parent().each(function()
      {
        var p = $(this);
        if(!p.hasClass("jjson-container")) {
          JSI_markAsExpanded(toExpand, p.parent());
        }
      });
    }
  });
  $("#searchResult>#searchCount").text(searchTotalCount);

  for( var x in toExpand) {
    toExpand[x].find(">span.expanded").each(function()
    {
      var s = $(this);
      s.removeClass('collapsed').parent().find('>ul').slideDown(100, function()
      {
        s.removeClass('collapsed').removeClass('hidden');
      });
    });
  }
}

function JSI_markFound(span, text, value)
{
  var idx = value.indexOf(text);
  if(idx >= 0) {
    var pre = value.substring(0, idx);
    var post = value.substring(idx + text.length);
    var html = $.parseHTML("<span class='pre'></span><span class='found'></span>");
    span.append(html);
    span.find(".pre").filter(":last").text(pre);
    span.find(".found").filter(":last").text(text);
    var count = 1 + JSI_markFound(span, text, post);
    return count;
  }
  else {
    var html = $.parseHTML("<span></span>");
    span.append(html);
    span.find("span").filter(":last").text(value);
    return 0;
  }
}

function JSI_markAsExpanded(toExpand, li)
{
  var id = li.attr("elementID");
  if(!id) {
    id = JSI_GenerateID("EL");
    li.attr("elementID", id);
  }
  if(!toExpand[id]) {
    toExpand[id] = li;
  }
  var ul = li.parent();
  if(ul.hasClass("jjson-container")) {
    return;
  }
  JSI_markAsExpanded(toExpand, ul.parent());
}

//==================================================================================================

function JSI_executeScript()
{
  var script = $("#Text_Script").val();
  $("#executeError").text("");

  JSI_eval(script, function(result)
  {
    JSI_addOutput(script, result);
    if(!(result == null || result == undefined)) {
      JSI_closeDialog("EnterScript");
    }
    else {
      $("#executeError").text("" + result);
    }
  }, function(error)
  {
    $("#executeError").text(error);
  });

  return false;
}

function JSI_eval(script, onSuccess, onError)
{
  var temp = false;
  var previousObject = undefined;
  if(typeof JSI_OBJECT != "object") {
    temp = true;
    previousObject = JSI_OBJECT;
    JSI_OBJECT = {};
    JSI_OBJECT.value = previousObject;
  }

  JSI_OBJECT.JSI_EXECUTE_SCRIPT = function()
  {
    return eval(script);
  };

  try {
    var result = JSI_OBJECT.JSI_EXECUTE_SCRIPT();
    delete JSI_OBJECT.JSI_EXECUTE_SCRIPT;
    if(onSuccess) {
      onSuccess(result);
    }
  }
  catch(error) {
    delete JSI_OBJECT.JSI_EXECUTE_SCRIPT;
    if(onError) {
      onError(error);
    }
  }

  if(temp) {
    JSI_OBJECT = previousObject;
  }
}

function JSI_addOutput(script, output)
{
  if(output == undefined) {
    return;
  }
  var id = JSI_GenerateID("OUT");
  var record = $.parseHTML("<div id='" + id + "' class='record'>" //
      + "<div class='commands'>" //
      + "<img src='menu_30x30.png' id='MenuButton_" + id + "' title='Show/hide menu'/>" //
      + "<div class='menu' id='Menu_" + id + "'>" //
      + "<img src='table_30x30.png' id='Table_" + id + "' title='Toggle table view'/>" //
      + "<img src='run_30x30.png' id='Refresh_" + id + "' title='Re-run the script'/>" //
      + "<img src='select_30x30.png' id='Select_" + id + "' title='Select the result'/>" //
      + "<img src='clone_30x30.png' id='SelectScript_" + id + "' title='Reuse the script'/>" //
      + "<img src='delete_30x30.png' id='Delete_" + id + "' title='Delete the row'/>" //
      + "</div>" //
      + "<div class='draghandle'></div>" //
      + "</div>" // 
      + "<div class='script'>" //
      + "<div id='Script" + id + "' class='js'></div>" //
      + "<div id='Note" + id + "' contenteditable='true' class='note'></div>" // 
      + "</div>" //
      + "<div class='content'><div id='Content" + id + "'></div></div>" //
      + "</div>");
  $("#output").append(record);
  $(record).find("#Script" + id).text(script).attr("title", script);
  $(record).find("#Note" + id).click(function()
  {
    $(this).focus()
  });

  var table = false;
  JSI_setOutput(id, output, table);

  $("#MenuButton_" + id).click(function()
  {
    JSI_toggleMenu(id, function()
    {
      $("#Delete_" + id).click(function()
      {
        $("#" + id).detach();
      });

      $("#Refresh_" + id).click(function()
      {
        JSI_eval(script, function(result)
        {
          output = result;
          JSI_setOutput(id, output, table);
        }, function(error)
        {
          alert("ERROR: " + error);
        });
      });

      $("#Table_" + id).click(function()
      {
        table = !table;
        JSI_setOutput(id, output, table);
      });

      $("#Select_" + id).click(function()
      {
        var src = JSON.stringify(output);
        JSI_addJSonObject($.parseJSON(src), src);
      });

      $("#SelectScript_" + id).click(function()
      {
        $("#Text_Script").val(script);
        $("#executeError").text("");
        $("#Dialog_EnterScript").addClass("visible");
      });
    });
  });

  JSI_goToByScroll("#" + id);
}

function JSI_toggleMenu(id, prepareMenuFunction)
{
  if($("#Menu_" + id).hasClass("showMenu")) {
    JSI_hideMenu(id);
  }
  else {
    JSI_showMenu(id, prepareMenuFunction);
  }
}

function JSI_showMenu(id, prepareMenuFunction)
{
  JSI_hideMenu(id);
  $("#Menu_" + id).show(200, function()
  {
    $(this).addClass("showMenu").find("*").click(function()
    {
      JSI_hideMenu(id);
    });
    if(prepareMenuFunction) {
      prepareMenuFunction();
    }
  });
}

function JSI_hideMenu(id)
{
  $("#Menu_" + id).hide(200, function()
  {
    $(this).removeClass("showMenu").find("*").off();
  });
}

function JSI_setOutput(id, output, showTable)
{
  try {
    if(showTable && (typeof output == "object")) {
      var generatedDiv = JSI_generateTable(output);
      $("#" + id + " #Content" + id).empty();
      $("#" + id + " #Content" + id).append(generatedDiv);
      var table = $(generatedDiv).find("table");
      var dataTable = table.DataTable({
        "aLengthMenu": [[-1, 10, 25, 50], ["All", 10, 25, 50]]
      });
      JSI_addHeaderControls(generatedDiv, table, dataTable);
    }
    else {
      $("#" + id + " #Content" + id).jJsonViewer(JSON.stringify(output), {
        expanded: false
      });
    }
  }
  catch(error) {
    alert("ERROR: " + error);
  }
}

function JSI_generateTable(object)
{
  var div = $
      .parseHTML("<div><button class='small'>Select</button><br/><span class='columns'></span><table class='tableView' cellspacing='0'></table></div>");
  var table = $(div).find("table");
  var columns = JSI_generateColumns(object);
  JSI_generateHeaders(columns, $(table), $(div));
  JSI_generateRows(object, $(table), columns);
  $(div).find("button").click(function()
  {
    $(table).selectElementContents();
  });
  return div;
}

function JSI_generateColumns(object)
{
  var headers = {};
  var indices = [];
  var subscripts = [];
  for( var x in object) {
    var row = object[x];
    if(typeof row == "object") {
      for( var y in row) {
        var idx = Number(y);
        y = "" + idx == "NaN" ? y : idx;
        if(!headers[y]) {
          headers[y] = true;
          if(typeof y == "number") {
            indices.push(y);
          }
          else {
            subscripts.push(y);
          }
        }
      }
    }
  }
  indices.sort(function(a, b)
  {
    return a - b;
  });
  subscripts = subscripts.concat(indices);
  return subscripts;
}

function JSI_generateHeaders(columns, table, div)
{
  var headerElement = $.parseHTML("<thead><tr></tr></thead>");
  var row = $(headerElement).find("tr");
  var filteredColumns = div.find(".columns");
  JSI_generateHeader(div, "Index", 0, row, filteredColumns);
  JSI_generateHeader(div, "VALUE", 1, row, filteredColumns);
  var index = 1;
  for( var x in columns) {
    var header = columns[x];
    index = index + 1;
    JSI_generateHeader(div, header, index, row, filteredColumns);
  }
  table.append(headerElement);
}

function JSI_generateHeader(div, header, index, headerRow, filteredColumns)
{
  var cell = JSI_generateCell(header, headerRow, "header");
  var img = $.parseHTML("<img class='colCtrl' src='delete-icon_8x8.png'/>");
  var cellDiv = cell.find("div");
  $(cellDiv).append(img);
  $(img).attr("title", "Hide '" + header + "' column");
  $(img).data("header", header);
  $(img).data("index", index);
  var col = $.parseHTML("<span class='colCtrl'>" + header + " </span>");
  $(col).attr("title", "Show '" + header + "' column");
  $(col).data("header", header);
  $(col).data("index", index);
  $(col).attr("id", "col" + index);
  $(col).addClass("shown");
  filteredColumns.append(col);
}

function JSI_addHeaderControls(div, table, dataTable)
{
  $(div).find(".colCtrl").click(function(e)
  {
    e.stopPropagation();
    var index = $(this).data("index");
    JSI_toggleColumnVisibility(div, table, dataTable, index);
  });
}

function JSI_toggleColumnVisibility(div, table, dataTable, index)
{
  var column = dataTable.column(index);
  var visible = !column.visible();
  column.visible(visible);
  if(visible) {
    $(div).find("#col" + index).addClass("shown");
  }
  else {
    $(div).find("#col" + index).removeClass("shown");
  }
  $(table).css("width", "auto");
  $(table).find("thead tr td").each(function(idx, element)
  {
    $(element).css("width", "auto");
  });
}

function JSI_generateRows(object, table, columns)
{
  var tbody = $.parseHTML("<tbody></tbody");
  table.append(tbody);
  for( var x in object) {
    var row = $.parseHTML("<tr></tr>");
    JSI_generateCell(x, $(row), "header");
    JSI_generateCells(object[x], $(row), columns);
    $(tbody).append(row);
  }
}

function JSI_generateCells(object, row, columns)
{
  if(typeof object == "object") {
    JSI_generateCell("", row, "value jsicol_VALUE");
    for( var x in columns) {
      var key = columns[x];
      var value = object[key];
      var cell = JSI_generateCell(value, row, "jsicol_" + columns[x]);
    }
  }
  else {
    JSI_generateCell(object, row, "value jsicol_VALUE");
    for( var x in columns) {
      var cell = JSI_generateCell("", row, "jsicol_" + columns[x]);
    }
  }
}

function JSI_generateCell(value, row, styleClass)
{
  var cell = $($.parseHTML("<td><div></div></td>"));
  if(styleClass) {
    cell.addClass(styleClass);
  }
  if(value != null) {
    $(cell).find("div").each(function()
    {
      var div = $(this);
      if(typeof value == "string") {
        div.text(value);
      }
      else if(typeof value == "number") {
        div.text(value);
        div.addClass("number");
      }
      else {
        var jsonString = JSON.stringify(value);
        div.jJsonViewer(jsonString, {
          expanded: false
        });
        div.css("padding-left", "12px");
        div.attr("title", jsonString);
      }
    });
  }
  row.append(cell);
  return cell;
}

function JSI_goToByScroll(selector)
{
  $("#workArea").animate({
    scrollTop: $(selector).offset().top
  }, 'slow');
}

//==================================================================================================
