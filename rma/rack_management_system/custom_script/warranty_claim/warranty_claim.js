

cur_frm.add_fetch("serial_no","warehouse","warehouse")
cur_frm.add_fetch("custom_serial","customer","customer")
cur_frm.add_fetch("sales_invoice","customer","customer")



frappe.ui.form.on("Warranty Claim",{

	refresh:function(frm){
		frm.trigger('add_button')

	
	},

	setup:function() {
		
	},

	onload: function(frm) {
		frm.trigger('add_button')
	},

	custom_serial:function(frm){
		if (frm.doc.custom_serial){

			frm.set_value("serial_no",frm.doc.custom_serial)
			frm.trigger("serial_no")
		}

	},	

	add_button:function(frm){



		frm.add_custom_button("Make Repair Invoice", function() {

			frappe.model.open_mapped_doc({
				method: "rma.rack_management_system.custom_script.warranty_claim.warranty_claim.make_repair_sales_invoice",
				frm: frm
			})

		},'Make')


		frm.add_custom_button("Make Replace Invoice", function() {

			frappe.model.open_mapped_doc({
				method: "rma.rack_management_system.custom_script.warranty_claim.warranty_claim.make_replace_sales_invoice",
				frm: frm
			})


		},'Make')


		frm.add_custom_button("Damage Stock Entry", function() {

			frappe.call({
				method: "rma.rack_management_system.custom_script.warranty_claim.warranty_claim.damage_stock_in",
				args: {"doc":frm.doc},
				callback: function(r) {

				}
			})

		},'Make')







	},

	sales_invoice:function(frm){
		if(frm.doc.sales_invoice){
			frm.trigger("show_dialog")
		}
	},

	show_dialog:function(frm){

		frappe.call({
			method: "rma.rack_management_system.custom_script.warranty_claim.warranty_claim.show_invoice_items",
			args: {"sales_invoice":frm.doc.sales_invoice},
			callback: function(r) {
				var items = r.message
				var all_activities = r.message.all_activities
				var dialog = new frappe.ui.Dialog({
					title: __("Sales Invice Item"),
					fields: [{
						fieldtype: "HTML",
						fieldname: "sales_invoice_items",
						label: __("Activity List"),
					}]
				})
				dialog.set_primary_action(__("Get"), function() {
					frm.events.get_dialog_items(frm, dialog);
				})
				var item_wrapper = dialog.fields_dict.sales_invoice_items.$wrapper;


				item_wrapper.html("")
				var html_line='';
				$.each(r.message, function(i,inv) {

					if (i===0 || (i % 4) === 0) {
						html_line = $('<div class="row"></div>').appendTo(item_wrapper);
					}
					$(repl('<div class="col-xs-6 neg-invoice-checkbox">\
						<div class="checkbox">\
						<label><input type="checkbox" class="sales_invoice_item" item_name="%(rec_name)s" \
						/>\
						<b>%(rec_name)s </b></label>\
						</div></div>', {rec_name: inv['item_code']})).appendTo(html_line);
				})

				dialog.show();
				dialog.$wrapper.find('.modal-dialog').css("width", "900px");

			}
		});


	},

	get_dialog_items:function(frm,dialog){

		var dialog_values = dialog.get_values()
		
		var item_wrapper = dialog.fields_dict.sales_invoice_items.$wrapper;
		$.each(item_wrapper.find('.sales_invoice_item:checked'), function(i, act){
			var item_code = $(this).attr('item_name')
			var row = frm.add_child('replace_repair_tbl');
			row.item_code = item_code

		})
		frm.refresh_field("replace_repair_tbl");
		dialog.hide();
	}

})
//--------------------------------------------------------------------------------------------------------------



frappe.ui.form.on("Repair Consumed Items",{

	rate:function(frm,cdt,cdn){
		var row = locals[cdt][cdn];
		var amount = row.qty * row.rate
		frappe.model.set_value(row.doctype, row.name, "amount", amount);
		var total = 0.0
		$.each(frm.doc.repaire_consumed_item,function(idx,row){
			total+=row.amount

		})
		frm.set_value("repair_cost",total)
	},

	qty:function(frm,cdt,cdn){
		var row = locals[cdt][cdn];
		var amount = row.qty * row.rate
		frappe.model.set_value(row.doctype, row.name, "amount", amount);

		var total = 0.0
		$.each(frm.doc.repaire_consumed_item,function(idx,row){
			total+=row.amount

		})
		frm.set_value("repair_cost",total)


	}

})


frappe.ui.form.on("Replace Repair Items",{

	rate:function(frm,cdt,cdn){
		var row = locals[cdt][cdn];
		var amount = row.qty * row.rate
		frappe.model.set_value(row.doctype, row.name, "amount", amount);
		var total = 0.0
		$.each(frm.doc.replace_repair_items,function(idx,row){
			total+=row.amount

		})
		frm.set_value("replacement_cost",total)
	},

	qty:function(frm,cdt,cdn){
		var row = locals[cdt][cdn];
		var amount = row.qty * row.rate
		frappe.model.set_value(row.doctype, row.name, "amount", amount);

		var total = 0.0
		$.each(frm.doc.replace_repair_items,function(idx,row){
			total+=row.amount

		})
		frm.set_value("replacement_cost",total)


	}

})

