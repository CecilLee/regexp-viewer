var jregexp = require('jregexp');

var REForm = React.createClass({
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
            <div className="panel panel-default">
                <div className="panel-heading">RE Expression</div>
                <div className="panel-body">
                    <div className="input-group input-group-lg">
                        <span className="input-group-addon">re</span>
                        <input className="form-control" id="re" type="text" placeholder="^abc" />
                        <span className="input-group-btn">
                            <input className="btn btn-default" type="button" value="view" onClick={this.view} />
                        </span>
                    </div>
                </div>
            </div>
        );
    }
});

React.render(
    <REForm />,
    document.getElementById('re-form')
);
