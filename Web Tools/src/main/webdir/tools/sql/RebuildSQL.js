function beautify(sql)
{
  sql = sql.split(" from ").join("\nFROM ");
  sql = sql.split(" FROM ").join("\nFROM ");
  sql = sql.split(" where ").join("\nWHERE ");
  sql = sql.split(" WHERE ").join("\nWHERE ");
  sql = sql.split(" inner join ").join("\n    INNER JOIN ");
  sql = sql.split(" INNER JOIN ").join("\n    INNER JOIN ");
  sql = sql.split(" left outer join ").join("\n    LEFT OUTER JOIN ");
  sql = sql.split(" LEFT OUTER JOIN ").join("\n    LEFT OUTER JOIN ");
  sql = sql.split(" right outer join ").join("\n    RIGHT OUTER JOIN ");
  sql = sql.split(" RIGHT OUTER JOIN ").join("\n    RIGHT OUTER JOIN ");
  sql = sql.split(" order by ").join("\nORDER BY ");
  sql = sql.split(" ORDER BY ").join("\nORDER BY ");
  sql = sql.split(" group by ").join("\ngroup BY ");
  sql = sql.split(" GROUP BY ").join("\nGROUP BY ");
  sql = sql.split(" having ").join("\nHAVING ");
  sql = sql.split(" HAVING ").join("\nHAVING ");
  sql = sql.split(" values ").join("\nVALUES ");
  sql = sql.split(" VALUES ").join("\nVALUES ");
  sql = sql.split(" union ").join("\nUNION ");
  sql = sql.split(" UNION ").join("\nUNION ");
  sql = sql + "\n ";
  return sql;
}

function rebuildSQLStatement(sql, val)
{
  try {
    var SplitPattern = />\s*</mg;
    var values = val.split(SplitPattern);
    var len = values.length;
    if(values.length > 0) {
      values[0] = values[0].substring(1);
      values[len - 1] = values[len - 1].substring(0, values[len - 1].length - 1);
    }

    var DatePattern = /^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})(\.[0-9]+)?$/; // <2014-09-19 02:00:00.0> <2014-09-20 01:59:59.0>

    var value;
    for( var v in values) {
      if(values[v] == "<null>") {
        value = "NULL";
      }
      else if(DatePattern.test(values[v])) {
        var date = DatePattern.exec(values[v]);
        value = "TO_DATE('" + date[1] + "', 'YYYY-MM-DD HH24:MI:SS')";
      }
      else if(isNaN(values[v]))
        value = "'" + values[v] + "'";
      else value = values[v];

      sql = sql.replace("?", value);
    }
    sql = beautify(sql);
    $("#result").text(sql);
    return sql;
  }
  catch(err) {
    alert(err);
  }

}

function translateTracerOutput()
{
  try {
    var tracer = $("#tracer").val();
    var SQLPattern = /^\s*SQL:?\s+(.+)$/mg;
    var SQLInsertsPattern = /^\s*SQL\s+Inserts:?\s+(.+)$/mg;

    var sql = SQLPattern.exec(tracer);
    if(sql != null) {
      sql = sql[1];
    }
    else {
      sql = "";
    }
    $("#sql").text(sql == "" ? "Error: Cannot parse input" : sql);

    var values = SQLInsertsPattern.exec(tracer);
    if(values != null) {
      values = values[1];
    }
    else {
      values = "";
    }
    $("#values").text(values == "" ? "No values found" : values);

    sql = rebuildSQLStatement(sql, values);

    $("#btnSelectAll").removeClass("hidden");
    addToHistory(sql, tracer);
  }
  catch(err) {
    alert(err);
  }
}

function selectText(containerid)
{
  $("#" + containerid).select();
}

var IDCounter = 0;

function GenerateID()
{
  return "ID" + (++IDCounter);
}

var historyCount = 0;

function addToHistory(sql, inputText)
{
  if(sql.trim() == "" || inputText.trim() == "") {
    return;
  }
  var found = false;
  $(".historyElement").each(function()
  {
    if($(this).data("SQL") == sql) {
      found = true;
    }
  });
  if(found) {
    return;
  }

  var text = sql.substring(0, 100);
  var ID = GenerateID();
  $("#history").append(
                       "<tr id='Row" + ID + "'><td><img src='recycle_30x30.png' id='Run" + ID
                           + "'></td><td><div class='historyElement' contenteditable='true' id='" + ID
                           + "'/></td><td><img src='delete_30x30.png' id='Del" + ID
                           + "' style='float: right'></td></tr>");
  historyCount++;
  var element = $("#" + ID);
  element.text(text);
  element.data("InputText", inputText);
  element.data("SQL", sql);
  $("#Run" + ID).click(function()
  {
    $("#tracer").val(element.data("InputText"));
    translateTracerOutput();
  });
  $("#Del" + ID).click(function()
  {
    $("#Row" + ID).detach();
    historyCount--;
    if(historyCount == 0) {
      $("#historyContainer").addClass("hidden");
    }
  });
  $("#Row" + ID).attr("title", inputText);
  $("#historyContainer").removeClass("hidden");
}

$(document).ready(function()
{
  $("#btnSelectAll").click(function()
  {
    selectText("result");
  });

  $("#btnTranslate").click(translateTracerOutput);

  $(window).on('beforeunload', function()
  {
    return 'ATTENZIONE: si stanno per pedere tutti i dati.\nVuoi veramente lasciare la pagina?';
  });
});
