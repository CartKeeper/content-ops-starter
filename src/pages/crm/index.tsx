  <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
          {secondaryPanelVisibility.upcomingShoots !== false ? (
              <SectionCard
                  title="Upcoming Shoots"
                  description="Stay ready for every session with a quick view of
  the week ahead."
                  action={
                      <Link
                          href="/bookings"
                          className="text-sm font-semibold text-[#4534FF]
  transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                      >
                          Open calendar
                      </Link>
                  }
              >
                  <BookingList bookings={upcomingBookings} />
              </SectionCard>
          ) : null}

          {secondaryPanelVisibility.activeClients !== false ? (
              <SectionCard
                  title="Active Clients"
                  description="From loyal regulars to new leads, see who needs
  attention next."
                  action={
                      <Link
                          href="/clients"
                          className="text-sm font-semibold text-[#4534FF]
  transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                      >
                          View all clients
                      </Link>
                  }
              >
                  <ClientTable clients={clients} />
              </SectionCard>
          ) : null}
      </div>

      <div className="space-y-6">
          {secondaryPanelVisibility.openInvoices !== false ? (
              <SectionCard
                  title="Open Invoices"
                  description="Collect payments faster with a focused list of
  outstanding balances."
                  action={
                      <Link
                          href="/invoices"
                          className="text-sm font-semibold text-[#4534FF]
  transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                      >
                          View all invoices
                      </Link>
                  }
              >
                  <InvoiceTable
                      invoices={openInvoices}
                      onUpdateStatus={handleUpdateInvoiceStatus}
                      onGeneratePdf={handleGenerateInvoicePdf}
                      onCreateCheckout={handleCreateCheckoutSession}
                      generatingInvoiceId={pdfInvoiceId}
                      checkoutInvoiceId={checkoutInvoiceId}
                  />
              </SectionCard>
          ) : null}

          {secondaryPanelVisibility.studioTasks !== false ? (
              <SectionCard
                  title="Studio Tasks"
                  description="Keep production moving with next actions across
  your team."
                  action={
                      <button className="text-sm font-semibold
  text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF]
  dark:hover:text-[#B8C5FF]">
                          Create task
                      </button>
                  }
              >
                  <TaskList tasks={tasks} />
              </SectionCard>
          ) : null}
      </div>
  </div>