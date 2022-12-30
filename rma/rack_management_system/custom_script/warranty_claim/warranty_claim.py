
from __future__ import unicode_literals
import frappe
import json
import frappe.utils
from frappe.utils import cstr, flt, getdate, comma_and, cint
from frappe import _
from frappe.model.utils import get_fetch_values
from frappe.model.mapper import get_mapped_doc
from erpnext.stock.stock_balance import update_bin_qty, get_reserved_qty
from frappe.desk.notifications import clear_doctype_notifications
from frappe.contacts.doctype.address.address import get_company_address
from erpnext.controllers.selling_controller import SellingController
from erpnext.accounts.doctype.subscription.subscription import get_next_schedule_date
from erpnext.selling.doctype.customer.customer import check_credit_limit
import json
from erpnext.stock.doctype.stock_entry.test_stock_entry import make_stock_entry
from erpnext.accounts.utils import get_company_default


@frappe.whitelist()
def make_repair_sales_invoice(source_name, target_doc=None, ignore_permissions=False):
	def postprocess(source, target):
		set_missing_values(source, target)
		#Get the advance paid Journal Entries in Sales Invoice Advance
		target.set_advances()

	def set_missing_values(source, target):
		target.is_pos = 0
		target.ignore_pricing_rule = 1
		target.update_stock = 0
		target.flags.ignore_permissions = True

		target.run_method("set_missing_values")
		target.run_method("set_po_nos")
		target.run_method("calculate_taxes_and_totals")

		# set company address
		target.update(get_company_address(target.company))
		if target.company_address:
			target.update(get_fetch_values("Sales Invoice", 'company_address', target.company_address))


	print(source_name,"====source_name")
	doclist = get_mapped_doc("Warranty Claim", source_name, {
		"Warranty Claim": {
			"doctype": "Sales Invoice",
			"warranty_claim_source":"name"

		},
		"Repair Consumed Items": {
			"doctype": "Sales Invoice Item",
			"field_map": {
				"amount": "amount",
				"rate":"rate",
				"qty":"qty"
			},
		},
		"Sales Taxes and Charges": {
			"doctype": "Sales Taxes and Charges",
			"add_if_empty": True,
			
		},
		"Sales Team": {
			"doctype": "Sales Team",
			"add_if_empty": True
		}
	}, target_doc, postprocess,ignore_permissions=ignore_permissions)

	return doclist




@frappe.whitelist()
def make_replace_sales_invoice(source_name, target_doc=None, ignore_permissions=False):
	def postprocess(source, target):
		set_missing_values(source, target)
		#Get the advance paid Journal Entries in Sales Invoice Advance
		target.set_advances()

	def set_missing_values(source, target):
		target.is_pos = 0
		target.ignore_pricing_rule = 1
		target.update_stock = 1
		target.flags.ignore_permissions = True

		target.run_method("set_missing_values")
		target.run_method("set_po_nos")
		target.run_method("calculate_taxes_and_totals")

		# set company address
		target.update(get_company_address(target.company))
		if target.company_address:
			target.update(get_fetch_values("Sales Invoice", 'company_address', target.company_address))


	print(source_name,"====source_name")
	doclist = get_mapped_doc("Warranty Claim", source_name, {
		"Warranty Claim": {
			"doctype": "Sales Invoice",
			"field_map": {
			"warranty_claim_source":"name"
			}

		},
		"Replace Repair Items": {
			"doctype": "Sales Invoice Item",
			"field_map": {
				"amount": "amount",
				"rate":"rate",
				"qty":"qty"
			},
		},
		"Sales Taxes and Charges": {
			"doctype": "Sales Taxes and Charges",
			"add_if_empty": True,
			
		},
		"Sales Team": {
			"doctype": "Sales Team",
			"add_if_empty": True
		}
	}, target_doc, postprocess,ignore_permissions=ignore_permissions)

	return doclist





@frappe.whitelist()
def show_invoice_items(sales_invoice):
	print(sales_invoice,"sales_invoice==============")
	items = frappe.db.get_all("Sales Invoice Item",
	filters={"parent": sales_invoice},
	fields=["item_code", "serial_no"])
	return items

@frappe.whitelist()
def damage_stock_in(doc):
	doc = json.loads(doc)
	company = doc.get("company")
	damage_warehouse = get_company_default(company,"damaged_warehouse")
	items = doc.get("replace_repair_tbl")
	first_item = items[0]


	se_doc = make_stock_entry(item_code=first_item.get("item_code"), 
								target=damage_warehouse, 
								qty=first_item.get("qty"), 
								basic_rate=first_item.get("rate"),
								purpose="Material Receipt",
								do_not_save=True,
								serial_no=first_item.get("serial_no"))
	
	for i in range(1,len(items)):
		itm = items[i]
		print("Rate ===",itm.get("rate"))
		se_doc.append('items',{
					'item_code': itm.get("item_code"),
					'qty': itm.get("qty"),
					"valuation_rate":itm.get("rate") or 1,
					"t_warehouse":damage_warehouse,
					"serial_no":itm.get("serial_no")

				})

	se_doc.save()
	se_doc.submit()


