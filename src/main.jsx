var jregexp = require('jregexp');

var MainStage = React.createClass({
    view: function(){
        var re = document.getElementById('re').value;
        console.log(jregexp.parse(re));
    },
    render: function(){
        return (
            <div>
                <input id="re" type="text" />
                <input type="button" value="view" onClick={this.view} />
            </div>
        );
    }
});

React.render(
    <MainStage />,
    document.getElementById('main-stage')
);
